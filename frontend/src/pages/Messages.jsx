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
    <main className="page">
      <section className="page-header">
        <h1>Messages</h1>
        <p>View your ride conversations and recent messages.</p>
      </section>

      {loading ? (
        <p className="empty-message">Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <section className="empty-message">
          <strong>No conversations yet.</strong>
          <p>Click “Message” on a ride or user profile to start one.</p>
        </section>
      ) : (
        <section className="post-list">
          {conversations.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const preview = conv.latest_message?.content || 'No messages yet';
            const previewTruncated =
              preview.length > 60 ? preview.slice(0, 60) + '...' : preview;

            return (
              <article
                key={conv.id}
                className={`conversation-card ${hasUnread ? 'unread' : ''}`}
                onClick={() => navigate(`/messages/${conv.id}`)}
              >
                <div className="small-avatar">
                  {(conv.other_username || '?').charAt(0).toUpperCase()}
                </div>

                <div className="conversation-info">
                  <div className="conversation-top">
                    <h2>{conv.other_username}</h2>

                    {conv.latest_message && (
                      <span className="conversation-time">
                        {formatTime(conv.latest_message.created_at)}
                      </span>
                    )}
                  </div>

                  <p className={hasUnread ? 'conversation-preview unread-text' : 'conversation-preview'}>
                    {previewTruncated}
                  </p>
                </div>

                {hasUnread && (
                  <span className="unread-badge">
                    {conv.unread_count}
                  </span>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default Messages;