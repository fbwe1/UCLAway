import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchUsers({ currentUserId }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setUsers([]);
      setLoading(false);
      setErrorMsg('');
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setErrorMsg('');

      try {
        const params = new URLSearchParams({
          search: trimmedSearch,
          currentUserId: String(currentUserId),
        });

        const res = await fetch(`http://localhost:3001/api/profile?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to search users');
          setUsers([]);
          return;
        }

        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setErrorMsg('Failed to connect to the backend server.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, currentUserId]);

  const startConversation = async (receiverId) => {
    try {
      const res = await fetch('http://localhost:3001/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to start conversation');
        return;
      }

      navigate(`/messages/${data.conversation.id}`);
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    }
  };

  const getDisplayName = (user) => {
    return user.first_name || user.username || `User ${user.profile_id}`;
  };

  const getInitial = (user) => {
    return getDisplayName(user).charAt(0).toUpperCase();
  };

  return (
    <main className="page">
      <section className="page-header">
        <h1>Search Users</h1>
        <p>Find classmates by username, name, or UCLA email.</p>
      </section>

      <section className="feed-controls">
        <input
          type="text"
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </section>

      {errorMsg && <p className="error-message">{errorMsg}</p>}

      {loading ? (
        <p className="empty-message">Searching...</p>
      ) : search.trim() && users.length === 0 ? (
        <p className="empty-message">No users found.</p>
      ) : !search.trim() ? (
        <p className="empty-message">Start typing to search for a user.</p>
      ) : (
        <section className="post-list">
          {users.map((user) => (
            <article className="user-card" key={user.profile_id}>
              <div className="small-avatar">{getInitial(user)}</div>

              <div className="user-card-info">
                <h2>{getDisplayName(user)}</h2>
                <p className="muted">
                  @{user.username || `user${user.profile_id}`} · User ID: {user.profile_id}
                </p>
              </div>

              <button
                type="button"
                className="user-message-button"
                onClick={() => startConversation(user.profile_id)}
              >
                Message
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default SearchUsers;