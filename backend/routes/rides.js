const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET all rides
router.get('/', async (req, res) => {
  try {
    const { data: rides, error } = await supabase
      .from('rides')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("SUPABASE ERROR DETAILS:", error.message, error.details, error.hint);
      throw error;
    }
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: "Database connection failed", details: error.message });
  }
});

// POST join a ride
router.post('/:rideId/join', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    // Block creator from joining their own ride
    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('creator_user_id')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id === userIdInt) {
      return res.status(400).json({ error: "You cannot join your own ride" });
    }

    // Use atomic RPC to prevent race conditions
    const { data, error } = await supabase.rpc('join_ride', {
      p_ride_id: rideId,
      p_user_id: userIdInt
    });

    if (error) throw error;
    if (data.error) return res.status(400).json({ error: data.error });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST leave a ride
router.post('/:rideId/leave', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id === userIdInt) {
      return res.status(400).json({ error: "Creators cannot leave their own ride" });
    }
    if (!ride.passengers || !ride.passengers.includes(userIdInt)) {
      return res.status(400).json({ error: "Not a passenger" });
    }

    const updatedSeats = ride.available_seats + 1;
    const updatedPassengers = ride.passengers.filter(id => id !== userIdInt);

    const { error: updateError } = await supabase
      .from('rides')
      .update({ available_seats: updatedSeats, passengers: updatedPassengers })
      .eq('id', rideId);

    if (updateError) throw updateError;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST remove a specific rider (creator only)
router.post('/:rideId/remove-rider', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { userId, riderId } = req.body;
    const userIdInt = parseInt(userId);
    const riderIdInt = parseInt(riderId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id !== userIdInt) {
      return res.status(403).json({ error: "Only the creator can remove riders" });
    }
    if (!ride.passengers || !ride.passengers.includes(riderIdInt)) {
      return res.status(400).json({ error: "User is not a passenger" });
    }

    const updatedPassengers = ride.passengers.filter(id => id !== riderIdInt);
    const updatedSeats = ride.available_seats + 1;

    const { error: updateError } = await supabase
      .from('rides')
      .update({ available_seats: updatedSeats, passengers: updatedPassengers })
      .eq('id', rideId);

    if (updateError) throw updateError;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a ride (creator only)
router.delete('/:rideId', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('creator_user_id')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id !== userIdInt) {
      return res.status(403).json({ error: "Only the creator can remove this ride" });
    }

    const { error: deleteError } = await supabase
      .from('rides')
      .delete()
      .eq('id', rideId);

    if (deleteError) throw deleteError;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;