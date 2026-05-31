const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET searchable user list derived from ride creators
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();

    const { data: rides, error } = await supabase
      .from('rides')
      .select('creator_user_id, title, pickup_location, destination, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw error;

    const byUserId = new Map();
    for (const ride of rides || []) {
      const userId = ride.creator_user_id;
      if (!byUserId.has(userId)) {
        byUserId.set(userId, {
          user_id: userId,
          latest_ride_title: ride.title || null,
          latest_route: `${ride.pickup_location} -> ${ride.destination}`,
          last_active_at: ride.created_at
        });
      }
    }

    let users = Array.from(byUserId.values());
    if (q) {
      users = users.filter((user) => String(user.user_id).includes(q));
    }

    res.json(users.slice(0, 50));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search users", details: error.message });
  }
});

module.exports = router;
