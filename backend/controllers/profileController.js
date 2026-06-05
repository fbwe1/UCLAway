const supabase = require("../supabaseClient");

async function getProfileById(req, res) {
    try {
        const userId = parseInt(req.params.id);

        const { data: user, error } = await supabase
            .from("profiles")
            .select("profile_id, username, full_name")
            .eq("profile_id", userId)
            .single();

        if (error || !user)
            return res.status(404).json({ error: "User not found" });

        // get follower/following counts
        const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
            supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_user_id", userId),
            supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", userId)
        ]);

        res.json({ ...user, followersCount, followingCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function searchUsers(req, res) {
    try {
        const search = req.query.search || "";

        const { data: users, error } = await supabase
            .from("profiles")
            .select("profile_id, username, full_name")
            .ilike("username", `%${search}%`);

        if (error) throw error;

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function followUser(req, res) {
    try {
        const followerUserId = parseInt(req.body.userId);
        const followedUserId = parseInt(req.params.id);

        if (followerUserId === followedUserId)
            return res.status(400).json({ error: "You cannot follow yourself" });

        const { data: existing } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId)
            .maybeSingle();

        if (existing)
            return res.status(400).json({ error: "Already following" });

        const { error } = await supabase
            .from("follows")
            .insert({ follower_user_id: followerUserId, followed_user_id: followedUserId });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function unfollowUser(req, res) {
    try {
        const followerUserId = parseInt(req.body.userId);
        const followedUserId = parseInt(req.params.id);

        const { error } = await supabase
            .from("follows")
            .delete()
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getFollowStatus(req, res) {
    try {
        const followerUserId = parseInt(req.query.userId);
        const followedUserId = parseInt(req.params.id);

        const { data } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_user_id", followerUserId)
            .eq("followed_user_id", followedUserId)
            .maybeSingle();

        res.json({ isFollowing: !!data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    getProfileById,
    searchUsers,
    followUser,
    unfollowUser,
    getFollowStatus,
};