const express = require('express');
const router = express.Router();
const supabase = require('../supabaseclient');

/*
  DIRECT MESSAGES ARCHITECTURE
  ─────────────────────────────
  Two tables:
    conversations: tracks who is talking to who (user1_id, user2_id)
    messages: individual messages within a conversation

  A conversation is always between exactly two users.
  We enforce user1_id < user2_id so there's never a duplicate
  conversation between the same two people (e.g. 5↔10 and 10↔5).

  Flow:
    1. User wants to message someone → POST /api/messages/conversations
       (creates or finds existing conversation)
    2. User fetches their conversations → GET /api/messages/conversations
    3. User opens a conversation → GET /api/messages/conversations/:id
    4. User sends a message → POST /api/messages/conversations/:id
    5. User reads messages → PUT /api/messages/conversations/:id/read
*/

// ─── GET all conversations for a user ────────────────────────────────────────
// Returns all conversations where the current user is either user1 or user2.
// Also returns the most recent message and unread count for each conversation
// so the inbox can show previews without fetching every message.
router.get('/conversations', async (req, res) => {
  try {
    // TODO: replace userId query param with auth token once auth merges
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    // Fetch all conversations this user is part of
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userIdInt},user2_id.eq.${userIdInt}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For each conversation, get the latest message and unread count
    // This gives the inbox enough info to show previews
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        // Get the most recent message
        const { data: latestMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Count unread messages sent by the OTHER user
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read', false)
          .neq('sender_id', userIdInt); // only count messages FROM the other person

        // Figure out who the other person is in this conversation
        const otherUserId = conv.user1_id === userIdInt ? conv.user2_id : conv.user1_id;

        // TODO: once auth merges, fetch the other user's username here
        // For now we just return their ID
        return {
          ...conv,
          other_user_id: otherUserId,
          // TODO: replace other_user_id with other_username after auth merges
          latest_message: latestMessages?.[0] || null,
          unread_count: unreadCount || 0
        };
      })
    );

    res.json(conversationsWithPreview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// ─── POST start or find a conversation ───────────────────────────────────────
// Called when a user wants to message someone for the first time,
// or when clicking "Message" on a ride card.
// If a conversation already exists between these two users, returns it.
// If not, creates a new one.
// We always store user1_id as the smaller ID to enforce uniqueness.
router.post('/conversations', async (req, res) => {
  try {
    // TODO: replace senderId with value from auth token once auth merges
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "senderId and receiverId are required" });
    }

    const senderInt = parseInt(senderId);
    const receiverInt = parseInt(receiverId);

    if (senderInt === receiverInt) {
      return res.status(400).json({ error: "Cannot start a conversation with yourself" });
    }

    // Enforce consistent ordering so there's never a duplicate conversation
    // e.g. user 5 messaging user 10 and user 10 messaging user 5
    // are the SAME conversation stored as user1_id=5, user2_id=10
    const user1_id = Math.min(senderInt, receiverInt);
    const user2_id = Math.max(senderInt, receiverInt);

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .single();

    if (existing) {
      // Conversation already exists — just return it
      return res.json({ success: true, conversation: existing, created: false });
    }

    // Create a new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({ user1_id, user2_id })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, conversation, created: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// ─── GET messages in a conversation ──────────────────────────────────────────
// Returns all messages in a specific conversation, oldest first.
// Also verifies the requesting user is actually part of this conversation
// so users can't read other people's messages.
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    // TODO: replace userId query param with auth token once auth merges
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Block users who aren't part of this conversation from reading it
    if (conversation.user1_id !== userIdInt && conversation.user2_id !== userIdInt) {
      return res.status(403).json({ error: "You are not part of this conversation" });
    }

    // Fetch all messages, oldest first so the chat renders top to bottom
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ conversation, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ─── POST send a message ──────────────────────────────────────────────────────
// Sends a message in a conversation.
// Verifies the sender is part of the conversation before allowing the send.
// After inserting, emits a Socket.io event so the receiver gets it instantly.
router.post('/conversations/:conversationId', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    // TODO: replace senderId with value from auth token once auth merges
    const { senderId, content } = req.body;

    if (!senderId || !content) {
      return res.status(400).json({ error: "senderId and content are required" });
    }

    const senderInt = parseInt(senderId);

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // Verify sender is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.user1_id !== senderInt && conversation.user2_id !== senderInt) {
      return res.status(403).json({ error: "You are not part of this conversation" });
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderInt,
        content: content.trim(),
        read: false
      })
      .select()
      .single();

    if (error) throw error;

    // Notify the other user instantly via Socket.io
    // The receiver listens for 'new-message' and updates their UI without refreshing
    const io = req.app.get('io');
    const receiverId = conversation.user1_id === senderInt
      ? conversation.user2_id
      : conversation.user1_id;

    io.emit('new-message', {
      conversationId,
      message,
      receiverId  // frontend uses this to only show the notification to the right user
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── PUT mark all messages in a conversation as read ─────────────────────────
// Called when a user opens a conversation.
// Only marks messages sent BY THE OTHER PERSON as read —
// you don't mark your own sent messages as read.
// After updating, emits a Socket.io event so the sender
// knows their message was seen (useful for read receipts later).
router.put('/conversations/:conversationId/read', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    // TODO: replace userId with value from auth token once auth merges
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    // Mark all unread messages in this conversation as read
    // EXCEPT messages sent by this user (you don't mark your own messages as read)
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userIdInt);

    if (error) throw error;

    // Notify the other person their messages were read
    const io = req.app.get('io');
    io.emit('messages-read', { conversationId, readBy: userIdInt });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// ─── DELETE a message ─────────────────────────────────────────────────────────
// Only the sender can delete their own message.
// Does not delete for both sides — just removes from DB entirely for now.
// TODO: consider soft delete (add deleted_at column) so both sides see "Message deleted"
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    // TODO: replace userId with value from auth token once auth merges
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    // Verify the message belongs to this user
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender_id !== userIdInt) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;