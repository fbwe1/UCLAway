import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Messages({ currentUserId, socket }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); return; }

      const res = await fetch(
        `http://localhost:3001/api/messages/conversations?userId=${currentUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setConversations(data);
    } catch {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-message', () => fetchConversations());
    return () => socket.off('new-message');
  }, [socket]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: true, timeZone: 'America/Los_Angeles'
    });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '16px' }}>Messages</h2>
      {loading ? (
        <p>Loading...</p>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          <p style={{ fontSize: '16px' }}>No conversations yet.</p>
          <p style={{ fontSize: '13px' }}>Click "Message" on a ride to start one.</p>
        </div>
      ) : (
        conversations.map(conv => {
          const hasUnread = conv.unread_count > 0;
          const preview = conv.latest_message?.content || 'No messages yet';
          const previewTruncated = preview.length > 50 ? preview.slice(0, 50) + '...' : preview;

          return (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '8px',
                border: `1px solid ${hasUnread ? '#4CAF50' : '#ccc'}`,
                marginBottom: '10px',
                cursor: 'pointer',
                backgroundColor: hasUnread ? '#f0fff0' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#4CAF50'}
              onMouseLeave={e => e.currentTarget.style.borderColor = hasUnread ? '#4CAF50' : '#ccc'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: hasUnread ? 'bold' : 'normal', fontSize: '15px' }}>
                    👤 {conv.other_username}
                  </span>
                  {hasUnread && (
                    <span style={{
                      backgroundColor: '#4CAF50', color: 'white',
                      borderRadius: '10px', padding: '1px 7px',
                      fontSize: '11px', fontWeight: 'bold'
                    }}>
                      {conv.unread_count} new
                    </span>
                  )}
                </div>
                <p style={{
                  margin: '4px 0 0', fontSize: '13px',
                  color: hasUnread ? '#333' : '#888',
                  fontWeight: hasUnread ? '500' : 'normal'
                }}>
                  {previewTruncated}
                </p>
              </div>
              {conv.latest_message && (
                <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  {formatTime(conv.latest_message.created_at)}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default Messages;