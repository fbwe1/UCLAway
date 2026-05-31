import { useEffect, useMemo, useState } from 'react';

function SearchUsers({ currentUserId }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [followLoadingUserId, setFollowLoadingUserId] = useState(null);
  const [followingSet, setFollowingSet] = useState(new Set());

  const filteredUsers = useMemo(() => users.filter(user => user.user_id !== currentUserId), [users, currentUserId]);

  const searchUsers = async (q = '') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`http://localhost:3001/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to search users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(error.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/users/search?q=')
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to search users');
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        setErrorMsg(error.message || 'Search failed');
      })
      .finally(() => {
        setLoading(false);
      });

    fetch(`http://localhost:3001/api/follows/${currentUserId}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to fetch follows');
        setFollowingSet(new Set((data || []).map(item => item.followed_user_id)));
      })
      .catch((error) => {
        console.error(error);
      });
  }, [currentUserId]);

  const handleFollowToggle = async (targetUserId) => {
    setFollowLoadingUserId(targetUserId);
    setErrorMsg('');
    const isFollowing = followingSet.has(targetUserId);

    try {
      const response = await fetch(
        isFollowing
          ? `http://localhost:3001/api/follows/${targetUserId}`
          : 'http://localhost:3001/api/follows',
        {
          method: isFollowing ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isFollowing
              ? { followerUserId: currentUserId }
              : { followerUserId: currentUserId, followedUserId: targetUserId }
          )
        }
      );
      const data = await response.json();
      if (!response.ok && response.status !== 409 && response.status !== 404) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      setFollowingSet(prev => {
        const next = new Set(prev);
        if (isFollowing) next.delete(targetUserId);
        else next.add(targetUserId);
        return next;
      });
    } catch (error) {
      setErrorMsg(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoadingUserId(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchUsers(query);
  };

  return (
    <main className="page">
      <section className="page-header">
        <h1>Search Users</h1>
        <p>Find users by ID and follow them to prioritize their rides.</p>
      </section>

      <section className="feed-controls">
        <form className="search-users-row" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Search by user ID (e.g. 251)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="primary-button">Search</button>
        </form>
      </section>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {loading ? (
        <p className="empty-message">Loading users...</p>
      ) : filteredUsers.length > 0 ? (
        <section className="post-list">
          {filteredUsers.map((user) => {
            const isFollowing = followingSet.has(user.user_id);
            const isLoading = followLoadingUserId === user.user_id;
            return (
              <article key={user.user_id} className="post-card user-result-card">
                <div>
                  <p className="user-id">User {user.user_id}</p>
                  <p className="muted">{user.latest_ride_title || 'Recent ride'}</p>
                  <p className="muted">{user.latest_route}</p>
                </div>
                <button
                  className={isFollowing ? 'follow-button-following' : 'follow-button'}
                  disabled={isLoading}
                  onClick={() => handleFollowToggle(user.user_id)}
                >
                  {isLoading ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <p className="empty-message">No users found.</p>
      )}
    </main>
  );
}

export default SearchUsers;
