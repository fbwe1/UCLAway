require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());
app.use(cors());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Subscribe to Supabase real-time on the backend
supabase
  .channel('rides-server')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'rides' },
    (payload) => {
      console.log('Supabase change detected:', payload.eventType);
      io.emit('rides-update', payload);
    }
  )
  .subscribe((status) => {
    console.log('Supabase realtime status:', status);
  });

app.get('/api/rides', async (req, res) => {
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

app.post('/api/rides/:rideId/join', async (req, res) => {
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

app.post('/api/rides/:rideId/leave', async (req, res) => {
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

app.delete('/api/rides/:rideId', async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const { userId } = req.body;
    const userIdInt = parseInt(userId);

    // Verify the requesting user is the creator
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

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT} (Connected to Supabase)`);
});