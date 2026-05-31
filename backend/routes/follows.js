const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// POST follow a user
router.post('/', async (req, res) => {
  try {
    const { followerUserId, followedUserId } = req.body;
    const followerUserIdInt = parseInt(followerUserId, 10);
    const followedUserIdInt = parseInt(followedUserId, 10);

    if (Number.isNaN(followerUserIdInt) || Number.isNaN(followedUserIdInt)) {
      return res.status(400).json({ error: "followerUserId and followedUserId must be numbers" });
    }
    if (followerUserIdInt === followedUserIdInt) {
      return res.status(400).json({ error: "Users cannot follow themselves" });
    }

    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_user_id: followerUserIdInt,
        followed_user_id: followedUserIdInt
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: "Already following this user" });
      }
      throw error;
    }

    res.status(201).json({ success: true, follow: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to follow user",
      details: error.message,
      code: error.code || null
    });
  }
});

// DELETE unfollow a user
router.delete('/:followedUserId', async (req, res) => {
  try {
    const followedUserIdInt = parseInt(req.params.followedUserId, 10);
    const followerUserIdInt = parseInt(req.body.followerUserId, 10);

    if (Number.isNaN(followerUserIdInt) || Number.isNaN(followedUserIdInt)) {
      return res.status(400).json({ error: "followerUserId and followedUserId must be numbers" });
    }

    const { data, error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_user_id', followerUserIdInt)
      .eq('followed_user_id', followedUserIdInt)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Follow relationship not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to unfollow user",
      details: error.message,
      code: error.code || null
    });
  }
});

// GET users followed by a user
router.get('/:userId', async (req, res) => {
  try {
    const userIdInt = parseInt(req.params.userId, 10);
    if (Number.isNaN(userIdInt)) {
      return res.status(400).json({ error: "userId must be a number" });
    }

    const { data, error } = await supabase
      .from('follows')
      .select('id, follower_user_id, followed_user_id, created_at')
      .eq('follower_user_id', userIdInt)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch followed users",
      details: error.message,
      code: error.code || null
    });
  }
});

module.exports = router;
