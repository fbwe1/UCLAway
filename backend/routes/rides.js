const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET all rides with optional filters
router.get('/', async (req, res) => {
  try {
    const { pickupLocation, destination, departureDate, minSeats, isRoundTrip } = req.query;

    let query = supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false });

    if (pickupLocation) query = query.ilike('pickup_location', `%${pickupLocation}%`);
    if (destination)    query = query.ilike('destination', `%${destination}%`);

    if (departureDate) {
      const startOfDay = new Date(`${departureDate}T00:00:00-07:00`).toISOString();
      const endOfDay   = new Date(`${departureDate}T23:59:59-07:00`).toISOString();
      query = query.gte('departure_time', startOfDay).lte('departure_time', endOfDay);
    }

    if (minSeats) {
      const minSeatsNumber = parseInt(minSeats, 10);
      if (Number.isNaN(minSeatsNumber) || minSeatsNumber < 0) {
        return res.status(400).json({ error: "minSeats must be a non-negative number" });
      }
      query = query.gte('available_seats', minSeatsNumber);
    }

    if (isRoundTrip !== undefined && isRoundTrip !== '') {
      query = query.eq('is_round_trip', isRoundTrip === 'true');
    }

    const { data: rides, error } = await query;
    if (error) throw error;
    res.json(rides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed", details: error.message });
  }
});

// GET ride history for a specific user
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const userIdInt = parseInt(userId);

    const { data, error } = await supabase
      .from('ride_history')
      .select('*')
      .or(`creator_user_id.eq.${userIdInt},passengers.cs.{${userIdInt}}`)
      .order('departure_time', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
});

// GET single ride by ID
router.get('/:rideId', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { data: ride, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (error || !ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
});

// POST create a ride
router.post('/', async (req, res) => {
  try {
    const {
      title, description, pickup_location, destination,
      total_seats, creator_user_id, departure_time,
      is_round_trip, return_time
    } = req.body;

    if (!title || !pickup_location || !destination || !total_seats || !creator_user_id || !departure_time) {
      return res.status(400).json({ error: "title, pickup_location, destination, total_seats, creator_user_id and departure_time are required" });
    }
    if (new Date(departure_time) <= new Date()) {
      return res.status(400).json({ error: "Departure time must be in the future" });
    }
    if (is_round_trip && return_time && new Date(return_time) <= new Date(departure_time)) {
      return res.status(400).json({ error: "Return time must be after departure time" });
    }

    const { data, error } = await supabase
      .from('rides')
      .insert({
        title,
        description: description || null,
        pickup_location,
        destination,
        total_seats: parseInt(total_seats),
        available_seats: parseInt(total_seats) - 1,
        passengers: [],
        removed_passengers: [],
        creator_user_id: parseInt(creator_user_id),
        departure_time,
        is_round_trip: is_round_trip || false,
        return_time: is_round_trip ? return_time : null
      })
      .select()
      .single();

    if (error) throw error;

    req.app.get('io').emit('rides-update', { eventType: 'INSERT', new: data });

    res.status(201).json({ success: true, ride: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create ride" });
  }
});

// PUT edit a ride (creator only)
router.put('/:rideId', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const {
      userId, title, description, pickup_location, destination,
      total_seats, departure_time, is_round_trip, return_time
    } = req.body;

    const userIdInt = parseInt(userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('creator_user_id, passengers')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.creator_user_id !== userIdInt) {
      return res.status(403).json({ error: 'Only the creator can edit this ride' });
    }

    const passengerCount = (ride.passengers || []).length;
    if (parseInt(total_seats) < passengerCount + 1) {
      return res.status(400).json({
        error: `Cannot reduce seats below current passenger count (${passengerCount + 1})`
      });
    }
    if (new Date(departure_time) <= new Date()) {
      return res.status(400).json({ error: 'Departure time must be in the future' });
    }
    if (is_round_trip && return_time && new Date(return_time) <= new Date(departure_time)) {
      return res.status(400).json({ error: 'Return time must be after departure time' });
    }

    const newTotalSeats     = parseInt(total_seats);
    const newAvailableSeats = newTotalSeats - 1 - passengerCount;

    const { data: updated, error: updateError } = await supabase
      .from('rides')
      .update({
        title,
        description: description || null,
        pickup_location,
        destination,
        total_seats: newTotalSeats,
        available_seats: newAvailableSeats,
        departure_time,
        is_round_trip: is_round_trip || false,
        return_time: is_round_trip ? return_time : null
      })
      .eq('id', rideId)
      .select()
      .single();

    if (updateError) throw updateError;

    req.app.get('io').emit('rides-update', { eventType: 'UPDATE', new: updated });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ride' });
  }
});

// POST join a ride
// Uses optimistic concurrency — the update only succeeds if a seat is still
// available and the user is not already a passenger. This replaces the
// join_ride SQL RPC function without relying on any database-specific features.
router.post('/:rideId/join', async (req, res) => {
  try {
    const rideId    = parseInt(req.params.rideId);
    const userIdInt = parseInt(req.body.userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id === userIdInt)
      return res.status(400).json({ error: "You cannot join your own ride" });
    if (new Date(ride.departure_time) <= new Date())
      return res.status(400).json({ error: "This ride has already departed" });
    if (ride.removed_passengers && ride.removed_passengers.includes(userIdInt))
      return res.status(403).json({ error: "You have been removed from this ride by the creator" });
    if (ride.passengers && ride.passengers.includes(userIdInt))
      return res.status(400).json({ error: "Already joined" });
    if (ride.available_seats <= 0)
      return res.status(400).json({ error: "Ride is full" });

    // Conditional update: only updates if available_seats is still > 0
    // and user is not already a passenger. Guards against race conditions.
    const { data: updated, error: updateError } = await supabase
      .from('rides')
      .update({
        available_seats: ride.available_seats - 1,
        passengers: [...(ride.passengers || []), userIdInt]
      })
      .eq('id', rideId)
      .gt('available_seats', 0)
      .not('passengers', 'cs', `{${userIdInt}}`)
      .select();

    if (updateError) throw updateError;
    if (!updated || updated.length === 0)
      return res.status(400).json({ error: "Ride is full or you have already joined" });

    req.app.get('io').emit('rides-update', { eventType: 'UPDATE', new: updated[0] });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST leave a ride
router.post('/:rideId/leave', async (req, res) => {
  try {
    const rideId    = parseInt(req.params.rideId);
    const userIdInt = parseInt(req.body.userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id === userIdInt)
      return res.status(400).json({ error: "Creators cannot leave their own ride" });
    if (!ride.passengers || !ride.passengers.includes(userIdInt))
      return res.status(400).json({ error: "Not a passenger" });

    const updatedPassengers = ride.passengers.filter(id => id !== userIdInt);

    const { data: updated, error: updateError } = await supabase
      .from('rides')
      .update({ available_seats: ride.available_seats + 1, passengers: updatedPassengers })
      .eq('id', rideId)
      .select()
      .single();

    if (updateError) throw updateError;

    req.app.get('io').emit('rides-update', { eventType: 'UPDATE', new: updated });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST remove a specific rider (creator only)
router.post('/:rideId/remove-rider', async (req, res) => {
  try {
    const rideId     = parseInt(req.params.rideId);
    const userIdInt  = parseInt(req.body.userId);
    const riderIdInt = parseInt(req.body.riderId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id !== userIdInt)
      return res.status(403).json({ error: "Only the creator can remove riders" });
    if (!ride.passengers || !ride.passengers.includes(riderIdInt))
      return res.status(400).json({ error: "User is not a passenger" });

    const updatedPassengers        = ride.passengers.filter(id => id !== riderIdInt);
    const updatedRemovedPassengers = [...(ride.removed_passengers || []), riderIdInt];

    const { data: updated, error: updateError } = await supabase
      .from('rides')
      .update({
        available_seats: ride.available_seats + 1,
        passengers: updatedPassengers,
        removed_passengers: updatedRemovedPassengers
      })
      .eq('id', rideId)
      .select()
      .single();

    if (updateError) throw updateError;

    const io = req.app.get('io');
    io.emit('rides-update', { eventType: 'UPDATE', new: updated });
    io.emit('rider-removed', { rideId, riderId: riderIdInt });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a ride (creator only)
router.delete('/:rideId', async (req, res) => {
  try {
    const rideId    = parseInt(req.params.rideId);
    const userIdInt = parseInt(req.body.userId);

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('creator_user_id')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) return res.status(404).json({ error: "Ride not found" });
    if (ride.creator_user_id !== userIdInt)
      return res.status(403).json({ error: "Only the creator can remove this ride" });

    const { error: deleteError } = await supabase
      .from('rides')
      .delete()
      .eq('id', rideId);

    if (deleteError) throw deleteError;

    req.app.get('io').emit('rides-update', { eventType: 'DELETE', old: { id: rideId } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
