import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function UserSearch({ currentUserId }) {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [followStatus, setFollowStatus] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setUsers([]);
      setFollowStatus({});
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

        const res = await fetch(`http://localhost:3001/api/profile?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to search users');
          setUsers([]);
          setFollowStatus({});
          return;
        }

        const filteredUsers = Array.isArray(data)
          ? data.filter((user) => Number(user.profile_id) !== Number(currentUserId))
          : [];

        setUsers(filteredUsers);

        const statuses = {};

        await Promise.all(
          filteredUsers.map(async (user) => {
            try {
              const statusRes = await fetch(
                `http://localhost:3001/api/profile/${user.profile_id}/follow-status?userId=${currentUserId}`,
                { headers: getAuthHeaders() }
              );

              const statusData = await statusRes.json();
              statuses[user.profile_id] = Boolean(statusData.isFollowing);
            } catch {
              statuses[user.profile_id] = false;
            }
          })
        );

        setFollowStatus(statuses);
      } catch {
        setErrorMsg('Failed to connect to the backend server.');
        setUsers([]);
        setFollowStatus({});
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, currentUserId]);

  const toggleFollow = async (profileId) => {
    const isFollowing = followStatus[profileId];

    setFollowLoading((prev) => ({
      ...prev,
      [profileId]: true,
    }));

    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:3001/api/profile/${profileId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update follow status');
        return;
      }

      setFollowStatus((prev) => ({
        ...prev,
        [profileId]: !isFollowing,
      }));
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setFollowLoading((prev) => ({
        ...prev,
        [profileId]: false,
      }));
    }
  };

  const startConversation = async (receiverId) => {
    try {
      const res = await fetch('http://localhost:3001/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
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
    return user.full_name || user.username || `User ${user.profile_id}`;
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

              <div
                className="user-card-info"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${user.profile_id}`)}
              >
                <h2>{getDisplayName(user)}</h2>
                <p className="muted">
                  @{user.username || `user${user.profile_id}`}
                </p>
              </div>

              <button
                type="button"
                className={followStatus[user.profile_id] ? 'secondary-button' : 'primary-button'}
                onClick={() => toggleFollow(user.profile_id)}
                disabled={followLoading[user.profile_id]}
                style={{
                  width: 'auto',
                  minWidth: '92px',
                  padding: '10px 16px',
                  marginTop: 0,
                }}
              >
                {followLoading[user.profile_id]
                  ? '...'
                  : followStatus[user.profile_id]
                    ? 'Unfollow'
                    : 'Follow'}
              </button>

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

export default UserSearch;