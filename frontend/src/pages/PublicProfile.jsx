import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function PublicProfile({ currentUserId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setActivityLoading(true);
      setErrorMsg("");

      try {
        const profileRes = await fetch(`http://localhost:3001/api/profile/${id}`, {
          headers: getAuthHeaders(),
        });

        const profileData = await profileRes.json();

        if (!profileRes.ok) {
          setErrorMsg(profileData.error || "User not found");
          return;
        }

        setProfile(profileData);

        const activityRes = await fetch(`http://localhost:3001/api/profile/${id}/activity`, {
          headers: getAuthHeaders(),
        });

        const activityData = await activityRes.json();

        if (activityRes.ok) {
          setActivities(Array.isArray(activityData) ? activityData : []);
        }

        if (Number(id) !== Number(currentUserId)) {
          const followRes = await fetch(
            `http://localhost:3001/api/profile/${id}/follow-status?userId=${currentUserId}`,
            { headers: getAuthHeaders() }
          );

          const followData = await followRes.json();
          setIsFollowing(Boolean(followData.isFollowing));
        }
      } catch {
        setErrorMsg("Failed to connect to the server.");
      } finally {
        setLoading(false);
        setActivityLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUserId]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`http://localhost:3001/api/profile/${id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update follow status");
        return;
      }

      setIsFollowing((prev) => !prev);

      setProfile((prev) => ({
        ...prev,
        followersCount: (prev.followersCount || 0) + (isFollowing ? -1 : 1),
      }));
    } catch {
      setErrorMsg("Failed to update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  const startConversation = async () => {
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:3001/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: Number(id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to start conversation");
        return;
      }

      navigate(`/messages/${data.conversation.id}`);
    } catch {
      setErrorMsg("Failed to connect to the backend server.");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "";

    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Los_Angeles",
    });
  };

  if (loading) {
    return (
      <main className="page">
        <p className="empty-message">Loading profile...</p>
      </main>
    );
  }

  if (errorMsg && !profile) {
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
  const displayName = profile.full_name || profile.username;
  const initial = displayName?.charAt(0).toUpperCase() || "?";

  return (
    <main className="page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
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

        <div className="stat-card">
          <h2>{activities.length}</h2>
          <p>Activities</p>
        </div>
      </section>

      {!isOwnProfile && (
        <div className="profile-action-row">
          <button
            type="button"
            onClick={toggleFollow}
            disabled={followLoading}
            className={isFollowing ? "secondary-button" : "primary-button"}
          >
            {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
          </button>

          <button
            type="button"
            onClick={startConversation}
            className="secondary-button"
          >
            Message
          </button>
        </div>
      )}

      {errorMsg && <p className="error-message">{errorMsg}</p>}

      <h2 className="section-title public-profile-section-title">
        Recent Activity
      </h2>

      <section className="activity-list">
        {activityLoading ? (
          <p className="empty-message">Loading recent activity...</p>
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <article className="activity-card" key={`${activity.activityType}-${activity.id}`}>
              <div className="activity-icon">
                {activity.activityType === "created" ? "＋" : "✓"}
              </div>

              <div className="activity-info">
                <h3>{activity.activityText}</h3>

                <p className="muted">
                  {activity.pickup_location} → {activity.destination}
                </p>

                <p className="activity-meta">
                  {activity.is_round_trip ? "Round Trip" : "One Way"}
                  {activity.departure_time && ` · ${formatDateTime(activity.departure_time)}`}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-message">No recent activity yet.</p>
        )}
      </section>
    </main>
  );
}

export default PublicProfile;