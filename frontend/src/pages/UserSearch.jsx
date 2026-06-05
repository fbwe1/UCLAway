import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UserSearch({ currentUserId }) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [followStatus, setFollowStatus] = useState({});
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const authHeader = { Authorization: `Bearer ${token}` };

    async function handleSearch(e) {
        e.preventDefault();
        if (!search.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:3001/api/profile?search=${encodeURIComponent(search)}`,
                { headers: authHeader }
            );
            const data = await res.json();
            const users = Array.isArray(data) ? data.filter(u => u.profile_id !== currentUserId) : [];
            setResults(users);

            // fetch follow status for all results
            const statuses = {};
            await Promise.all(users.map(async (user) => {
                const r = await fetch(
                    `http://localhost:3001/api/profile/${user.profile_id}/follow-status?userId=${currentUserId}`,
                    { headers: authHeader }
                );
                const d = await r.json();
                statuses[user.profile_id] = d.isFollowing;
            }));
            setFollowStatus(statuses);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function toggleFollow(profileId) {
        const isFollowing = followStatus[profileId];
        try {
            await fetch(`http://localhost:3001/api/profile/${profileId}/follow`, {
                method: isFollowing ? "DELETE" : "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId })
            });
            setFollowStatus(prev => ({ ...prev, [profileId]: !isFollowing }));
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <main className="page">
            <section className="page-header">
                <h1>Find Users</h1>
                <p>Search for UCLA students by username.</p>
            </section>

            <form onSubmit={handleSearch} className="feed-controls">
                <input
                    type="text"
                    placeholder="Search by username..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button type="submit" className="primary-button">Search</button>
            </form>

            <section className="post-list" style={{ marginTop: "20px" }}>
                {loading ? (
                    <p className="empty-message">Searching...</p>
                ) : results.length > 0 ? (
                    results.map(user => (
                        <div key={user.profile_id} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            background: "white",
                            marginBottom: "10px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                        }}>
                            <div
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/profile/${user.profile_id}`)}
                            >
                                <p style={{ margin: 0, fontWeight: "bold" }}>{user.username}</p>
                                <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>{user.full_name}</p>
                            </div>
                            <button
                                className={followStatus[user.profile_id] ? "secondary-button" : "primary-button"}
                                onClick={() => toggleFollow(user.profile_id)}
                                style={{ minWidth: "80px", padding: "6px 14px", flexShrink: 0, width: "auto" }}

                            >
                                {followStatus[user.profile_id] ? "Unfollow" : "Follow"}
                            </button>
                        </div>
                    ))
                ) : search && !loading ? (
                    <p className="empty-message">No users found.</p>
                ) : null}
            </section>
        </main>
    );
}