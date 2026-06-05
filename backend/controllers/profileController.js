const supabase = require("../supabaseclient");
const PROFILE_COLUMNS = "profile_id, username, full_name, ucla_email";

function cleanSearchTerm(value) {
    return String(value || "")
        .trim()
        .replace(/^@/, "")
        .replace(/[%,()]/g, "")
        .slice(0, 50);
}

async function getProfileById(req, res) {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const { data: user, error } = await supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .eq("profile_id", userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
            supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("followed_user_id", userId),

            supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("follower_user_id", userId),
        ]);

        res.json({
            ...user,
            followersCount: followersCount || 0,
            followingCount: followingCount || 0,
        });
    } catch (err) {
        console.error("Failed to fetch profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function searchUsers(req, res) {
    try {
        const search = cleanSearchTerm(req.query.search);
        const currentUserId = Number(req.query.currentUserId);

        if (!search) {
            return res.json([]);
        }

        let query = supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .or(`username.ilike.%${search}%,full_name.ilike.%${search}%,ucla_email.ilike.%${search}%`)
            .order("username", { ascending: true })
            .limit(20);

        if (Number.isInteger(currentUserId)) {
            query = query.neq("profile_id", currentUserId);
        }

        const { data: users, error } = await query;

        if (error) throw error;

        res.json(users || []);
    } catch (err) {
        console.error("Failed to search users:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function followUser(req, res) {
    try {
        const followerUserId = Number(req.body.userId);
        const followedUserId = Number(req.params.id);

        if (!Number.isInteger(followerUserId) || !Number.isInteger(followedUserId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        if (followerUserId === followedUserId) {
            return res.status(400).json({ error: "You cannot follow yourself" });
        }

        const { data: existing, error: existingError } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
            return res.status(400).json({ error: "Already following" });
        }

        const { error } = await supabase
            .from("follows")
            .insert({
                follower_user_id: followerUserId,
                followed_user_id: followedUserId,
            });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to follow user:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function unfollowUser(req, res) {
    try {
        const followerUserId = Number(req.body.userId);
        const followedUserId = Number(req.params.id);

        if (!Number.isInteger(followerUserId) || !Number.isInteger(followedUserId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const { error } = await supabase
            .from("follows")
            .delete()
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to unfollow user:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getFollowStatus(req, res) {
    try {
        const followerUserId = Number(req.query.userId);
        const followedUserId = Number(req.params.id);

        if (!Number.isInteger(followerUserId) || !Number.isInteger(followedUserId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const { data, error } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId)
            .maybeSingle();

        if (error) throw error;

        res.json({ isFollowing: Boolean(data) });
    } catch (err) {
        console.error("Failed to get follow status:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getRecentActivity(req, res) {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const rideColumns = `
            id,
            title,
            pickup_location,
            destination,
            creator_user_id,
            passengers,
            departure_time,
            created_at,
            is_round_trip
        `;

        const [
            { data: createdRides, error: createdError },
            { data: joinedRides, error: joinedError },
            { data: createdHistory, error: createdHistoryError },
            { data: joinedHistory, error: joinedHistoryError },
        ] = await Promise.all([
            supabase
                .from("rides")
                .select(rideColumns)
                .eq("creator_user_id", userId)
                .order("created_at", { ascending: false })
                .limit(6),

            supabase
                .from("rides")
                .select(rideColumns)
                .contains("passengers", [userId])
                .order("created_at", { ascending: false })
                .limit(6),

            supabase
                .from("ride_history")
                .select(rideColumns)
                .eq("creator_user_id", userId)
                .order("departure_time", { ascending: false })
                .limit(6),

            supabase
                .from("ride_history")
                .select(rideColumns)
                .contains("passengers", [userId])
                .order("departure_time", { ascending: false })
                .limit(6),
        ]);

        if (createdError) throw createdError;
        if (joinedError) throw joinedError;
        if (createdHistoryError) throw createdHistoryError;
        if (joinedHistoryError) throw joinedHistoryError;

        const activities = [
            ...(createdRides || []).map((ride) => ({
                ...ride,
                activityType: "created",
                activityText: `Created a ride to ${ride.destination}`,
            })),

            ...(joinedRides || []).map((ride) => ({
                ...ride,
                activityType: "joined",
                activityText: `Joined a ride to ${ride.destination}`,
            })),

            ...(createdHistory || []).map((ride) => ({
                ...ride,
                activityType: "created",
                activityText: `Created a ride to ${ride.destination}`,
            })),

            ...(joinedHistory || []).map((ride) => ({
                ...ride,
                activityType: "joined",
                activityText: `Joined a ride to ${ride.destination}`,
            })),
        ];

        const uniqueActivities = Array.from(
            new Map(
                activities.map((activity) => [
                    `${activity.activityType}-${activity.id}`,
                    activity,
                ])
            ).values()
        );

        uniqueActivities.sort((a, b) => {
            const dateA = new Date(a.created_at || a.departure_time);
            const dateB = new Date(b.created_at || b.departure_time);
            return dateB - dateA;
        });

        res.json(uniqueActivities.slice(0, 6));
    } catch (err) {
        console.error("Failed to fetch recent activity:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    getProfileById,
    searchUsers,
    followUser,
    unfollowUser,
    getFollowStatus,
    getRecentActivity,
};