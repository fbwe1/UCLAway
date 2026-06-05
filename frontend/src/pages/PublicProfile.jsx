import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function PublicProfile({ currentUserId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMsg('');

      try {
        const profileRes = await fetch(`http://localhost:3001/api/profile/${id}`, {
          headers: getAuthHeaders(),
        });

        const profileData = await profileRes.json();

        if (!profileRes.ok) {
          setErrorMsg(profileData.error || 'User not found');
          return;
        }

        setProfile(profileData);

        if (Number(id) !== Number(currentUserId)) {
          const followRes = await fetch(
            `http://localhost:3001/api/profile/${id}/follow-status?userId=${currentUserId}`,
            { headers: getAuthHeaders() }
          );

          const followData = await followRes.json();
          setIsFollowing(Boolean(followData.isFollowing));
        }
      } catch {
        setErrorMsg('Failed to connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUserId]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:3001/api/profile/${id}/follow`, {
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

      setIsFollowing((prev) => !prev);

      setProfile((prev) => ({
        ...prev,
        followersCount: (prev.followersCount || 0) + (isFollowing ? -1 : 1),
      }));
    } catch {
      setErrorMsg('Failed to update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <p className="empty-message">Loading profile...</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="page">
        <p className="error-message">{errorMsg}</p>
        <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </main>
    );
  }

  const isOwnProfile = Number(id) === Number(currentUserId);
  const displayName = profile.first_name || profile.full_name || profile.username;
  const initial = displayName?.charAt(0).toUpperCase() || '?';

  return (
    <main className="page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: '#4CAF50',
          fontSize: '15px',
          cursor: 'pointer',
          fontWeight: 'bold',
          padding: '0 0 16px 0',
        }}
      >
        ← Back
      </button>

      <section className="profile-card">
        <div className="avatar">{initial}</div>

        <div>
          <h1>{profile.username}</h1>
          <p className="muted">{displayName}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <h2>{profile.followersCount ?? 0}</h2>
          <p>Followers</p>
        </div>

        <div className="stat-card">
          <h2>{profile.followingCount ?? 0}</h2>
          <p>Following</p>
        </div>
      </section>

      {!isOwnProfile && (
        <button
          type="button"
          onClick={toggleFollow}
          disabled={followLoading}
          className={isFollowing ? 'secondary-button' : 'primary-button'}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </main>
  );
}

export default PublicProfile;