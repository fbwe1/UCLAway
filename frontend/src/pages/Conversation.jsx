import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Conversation({ currentUserId, socket }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const conversationId = parseInt(id);

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto scroll to bottom when new messages arrive
  const bottomRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/messages/conversations/${conversationId}?userId=${currentUserId}`
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load conversation');
      } else {
        setConversation(data.conversation);
        setMessages(data.messages);
        // Mark messages as read when opening the conversation
        markAsRead();
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(
        `http://localhost:3001/api/messages/conversations/${conversationId}/read`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId })
        }
      );
    } catch {
      // Silently fail — not critical if read status doesn't update
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for new messages via Socket.io
  // When a new message arrives for this conversation, append it to the list
  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', ({ conversationId: incomingConvId, message }) => {
      // Only update if the message belongs to THIS conversation
      // AND the message is from the OTHER user — we already added our own message
      // immediately after sending so we don't want to add it again from the socket
      if (incomingConvId === conversationId && message.sender_id !== currentUserId) {
        setMessages(prev => [...prev, message]);
        markAsRead();
      }
    });

    return () => socket.off('new-message');
  }, [socket, conversationId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    setErrorMsg('');

    try {
      const res = await fetch(
        `http://localhost:3001/api/messages/conversations/${conversationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUserId, content: newMessage.trim() })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send message');
      } else {
        // Add the sent message to the list immediately (don't wait for socket)
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setSending(false);
    }
  };

  // Allow sending with Enter key (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles' // TODO: get from user profile after auth merges
    });
  };

  // Figure out who the other person is
  // TODO: replace with username after auth merges
  const otherUserId = conversation
    ? (conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id)
    : null;

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  if (errorMsg && !conversation) return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: 'red' }}>{errorMsg}</p>
      <button onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)' // fill available height below nav
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #ccc',
        marginBottom: '12px'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#4CAF50',
            fontSize: '15px',
            cursor: 'pointer',
            fontWeight: 'bold',
            padding: 0
          }}
        >
          ←
        </button>
        <div>
          <h3 style={{ margin: 0 }}>
            User {otherUserId}
            {/* TODO: replace with username after auth merges */}
          </h3>
          <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
            {/* TODO: show online status after auth merges */}
            Conversation #{conversationId}
          </p>
        </div>
      </div>

      {/* Messages list — scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingBottom: '8px'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', marginTop: '40px' }}>
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  backgroundColor: isMine ? '#4CAF50' : '#2a2a2a',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  maxWidth: '75%',
                  fontSize: '14px',
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </div>
                <span style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
                  {formatTime(msg.created_at)}
                  {/* Show read receipt for your own messages */}
                  {isMine && (
                    <span style={{ marginLeft: '6px' }}>
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        {/* Invisible div at bottom for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {errorMsg && <p style={{ color: 'red', fontSize: '13px' }}>{errorMsg}</p>}

      {/* Message input */}
      <div style={{
        display: 'flex',
        gap: '8px',
        paddingTop: '12px',
        borderTop: '1px solid #ccc'
      }}>
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '14px',
            resize: 'none',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          style={{
            backgroundColor: sending || !newMessage.trim() ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0 20px',
            fontWeight: 'bold',
            cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default Conversation;