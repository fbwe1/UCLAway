import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import RideCard from "./components/RideCard"

export default function Profile({ currentUserId, onLogout }) {
  const [rides, setRides] = useState([])
  const [history, setHistory] = useState([])
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchProfile = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/profile/${currentUserId}`,
        { headers: authHeader }
      );
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  const fetchRides = () => {
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("http://localhost:3001/api/rides", { headers: authHeader }).then(res => res.json()),
      fetch(`http://localhost:3001/api/rides/history?userId=${currentUserId}`, { headers: authHeader }).then(res => res.json())
    ])
      .then(([activeData, historyData]) => {
        setRides(Array.isArray(activeData) ? activeData : [])
        setHistory(Array.isArray(historyData) ? historyData : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching profile rides:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchProfile();
    fetchRides();
  }, [currentUserId])

  const createdRides = [...rides, ...history]
    .filter((ride) => Number(ride.creator_user_id) === Number(currentUserId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const joinedRides = [...rides, ...history]
    .filter((ride) => ride.passengers?.map(Number).includes(Number(currentUserId)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const totalRides = createdRides.length + joinedRides.length
  const username = localStorage.getItem("username") || "User";

  return (
    <main className="page">
      <section className="profile-card">
        <div className="avatar">{username[0]?.toUpperCase()}</div>
        <div>
          <h1>{username}</h1>
          <p className="muted">{profileData?.full_name}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <h2>{profileData?.followersCount ?? "—"}</h2>
          <p>Followers</p>
        </div>
        <div className="stat-card">
          <h2>{profileData?.followingCount ?? "—"}</h2>
          <p>Following</p>
        </div>
        <div className="stat-card">
          <h2>{totalRides}</h2>
          <p>Total Rides</p>
        </div>
      </section>

      <button
        className="secondary-button"
        style={{ marginBottom: "16px" }}
        onClick={onLogout}
      >
        Logout
      </button>

      <button
        className="secondary-button"
        style={{ marginBottom: "16px" }}
        onClick={() => navigate("/users")}
      >
        🔍 Find Users
      </button>

      <h2 className="section-title">My Joined Rides</h2>
      <section className="post-list">
        {loading ? (
          <p className="empty-message">Loading rides...</p>
        ) : joinedRides.length > 0 ? (
          joinedRides.map((ride) => (
            <RideCard key={ride.id} ride={ride} currentUserId={currentUserId} onUpdate={fetchRides} />
          ))
        ) : (
          <p className="empty-message">You have not joined any rides yet.</p>
        )}
      </section>

      <h2 className="section-title">My Created Rides</h2>
      <section className="post-list">
        {loading ? (
          <p className="empty-message">Loading rides...</p>
        ) : createdRides.length > 0 ? (
          createdRides.map((ride) => (
            <RideCard key={ride.id} ride={ride} currentUserId={currentUserId} onUpdate={fetchRides} />
          ))
        ) : (
          <p className="empty-message">You have not created any rides yet.</p>
        )}
      </section>
    </main>
  )
}