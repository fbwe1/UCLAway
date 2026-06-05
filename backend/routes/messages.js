const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ─── GET all conversations for a user ────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userIdInt},user2_id.eq.${userIdInt}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.user1_id === userIdInt ? conv.user2_id : conv.user1_id;

        const [{ data: latestMessages }, { count: unreadCount }, { data: otherProfile }] = await Promise.all([
          supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('read', false).neq('sender_id', userIdInt),
          supabase.from('profiles').select('username').eq('profile_id', otherUserId).maybeSingle()
        ]);

        return {
          ...conv,
          other_user_id: otherUserId,
          other_username: otherProfile?.username || `User ${otherUserId}`,
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
router.post('/conversations', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId)
      return res.status(400).json({ error: "senderId and receiverId are required" });

    const senderInt = parseInt(senderId);
    const receiverInt = parseInt(receiverId);

    if (senderInt === receiverInt)
      return res.status(400).json({ error: "Cannot start a conversation with yourself" });

    const user1_id = Math.min(senderInt, receiverInt);
    const user2_id = Math.max(senderInt, receiverInt);

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .single();

    if (existing)
      return res.json({ success: true, conversation: existing, created: false });

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
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation)
      return res.status(404).json({ error: "Conversation not found" });

    if (conversation.user1_id !== userIdInt && conversation.user2_id !== userIdInt)
      return res.status(403).json({ error: "You are not part of this conversation" });

    const otherUserId = conversation.user1_id === userIdInt
      ? conversation.user2_id
      : conversation.user1_id;

    const [{ data: messages, error }, { data: otherProfile }] = await Promise.all([
      supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
      supabase.from('profiles').select('username').eq('profile_id', otherUserId).maybeSingle()
    ]);


    if (error) throw error;

    res.json({
      conversation: {
        ...conversation,
        other_username: otherProfile?.username || `User ${otherUserId}`
      },
      messages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ─── POST send a message ──────────────────────────────────────────────────────
router.post('/conversations/:conversationId', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { senderId, content } = req.body;

    if (!senderId || !content)
      return res.status(400).json({ error: "senderId and content are required" });

    const senderInt = parseInt(senderId);

    if (content.trim().length === 0)
      return res.status(400).json({ error: "Message cannot be empty" });

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation)
      return res.status(404).json({ error: "Conversation not found" });

    if (conversation.user1_id !== senderInt && conversation.user2_id !== senderInt)
      return res.status(403).json({ error: "You are not part of this conversation" });

    const { data: message, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderInt, content: content.trim(), read: false })
      .select()
      .single();

    if (error) throw error;

    const io = req.app.get('io');
    const receiverId = conversation.user1_id === senderInt
      ? conversation.user2_id
      : conversation.user1_id;

    io.emit('new-message', { conversationId, message, receiverId });

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── PUT mark messages as read ────────────────────────────────────────────────
router.put('/conversations/:conversationId/read', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const userIdInt = parseInt(userId);

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userIdInt);

    if (error) throw error;

    req.app.get('io').emit('messages-read', { conversationId, readBy: userIdInt });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// ─── DELETE a message ─────────────────────────────────────────────────────────
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message)
      return res.status(404).json({ error: "Message not found" });

    if (message.sender_id !== userIdInt)
      return res.status(403).json({ error: "You can only delete your own messages" });

    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;