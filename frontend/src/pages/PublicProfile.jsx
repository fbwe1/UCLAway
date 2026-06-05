import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function PublicProfile({ currentUserId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}` };
  //expired token = redirect to login
  const handleUnauthenticated = (res) => {
    //unauthorized case
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.reload();
      return true;}
    return false;
  };
  const fetchProfile = async () => {
    try {
      const [profileRes, followRes] = await Promise.all([
        fetch(`http://localhost:3001/api/profile/${id}`, { headers: authHeader }),
        fetch(`http://localhost:3001/api/profile/${id}/follow-status?userId=${currentUserId}`, { headers: authHeader })
      ]);
      if (handleUnauthenticated(profileRes)){
        return;}
      if (handleUnauthenticated(followRes)){
        return;}
      const profileData = await profileRes.json();
      const followData = await followRes.json();

      if (!profileRes.ok) {
        setErrorMsg(profileData.error || 'User not found');
      } else {
        setProfile(profileData);
        setIsFollowing(followData.isFollowing);
      }
    } catch {
      setErrorMsg('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [id]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/profile/${id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (handleUnauthenticated(res)){
        return;}
      setIsFollowing(prev => !prev);
      setProfile(prev => ({
        ...prev,
        followersCount: prev.followersCount + (isFollowing ? -1 : 1)
      }));
    } catch {
      setErrorMsg('Failed to update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (errorMsg) return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: 'red' }}>{errorMsg}</p>
      <button onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const isOwnProfile = parseInt(id) === currentUserId;

  return (
    <main className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#4CAF50', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold', padding: '0 0 16px 0' }}
      >
        ← Back
      </button>

      <section className="profile-card">
        <div className="avatar">{profile.username[0]?.toUpperCase()}</div>
        <div>
          <h1>{profile.username}</h1>
          <p className="muted">{profile.full_name}</p>
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