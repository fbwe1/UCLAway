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
  const bottomRef = useRef(null);

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchMessages = async () => {
    try {
      if (!token) { setErrorMsg("Please log in again."); setLoading(false); return; }
      const res = await fetch(
        `http://localhost:3001/api/messages/conversations/${conversationId}?userId=${currentUserId}`,
        { headers: authHeader }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load conversation');
      } else {
        setConversation(data.conversation);
        setMessages(data.messages);
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
      await fetch(`http://localhost:3001/api/messages/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
    } catch {}
  };

  useEffect(() => { fetchMessages(); }, [conversationId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-message', ({ conversationId: incomingConvId, message }) => {
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
      const res = await fetch(`http://localhost:3001/api/messages/conversations/${conversationId}`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, content: newMessage.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send message');
      } else {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: true, timeZone: 'America/Los_Angeles'
    });
  };

  if (loading) {
    return (
      <main className="page">
        <p className="empty-message">Loading conversation...</p>
      </main>
    );
  }

  if (errorMsg && !conversation) {
    return (
      <main className="page">
        <p className="error-message">{errorMsg}</p>
        <button className="secondary-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </main>
    );
  }

  return (
    <main className="page conversation-page">
      <section className="chat-card">
        <div className="chat-header">
          <button className="back-link" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <div>
            <h1>{conversation?.other_username}</h1>
          </div>
        </div>

        <div className="message-list">
          {messages.length === 0 ? (
            <p className="empty-chat-message">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                >
                  <div className="message-bubble">
                    {msg.content}
                  </div>

                  <span className="message-time">
                    {formatTime(msg.created_at)}
                    {isMine && (
                      <span className="read-mark">
                        {msg.read ? ' ✓✓' : ' ✓'}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        {errorMsg && <p className="error-message">{errorMsg}</p>}

        <div className="message-compose">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={2}
          />

          <button
            className="primary-button message-send-button"
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default Conversation;