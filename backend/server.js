require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const supabase = require("./supabaseClient");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Make io accessible in all route files via req.app.get('io')
app.set('io', io);

app.get("/", (req, res) => {
  res.send("UCLAway backend is running");
});

// ─── Supabase real-time listeners ─────────────────────────────────────────────
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' },
    (payload) => {
      console.log('Rides change detected:', payload.eventType);
      io.emit('rides-update', payload);
    })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
    () => {
      console.log('New message detected');
    })
  .subscribe((status) => {
    console.log('Supabase realtime status:', status);
  });

// Routes
const rideRoutes = require('./routes/rides');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profileRoutes');
const followsRoutes = require('./routes/follows');
const usersRoutes = require('./routes/users');

app.use('/api/rides', rideRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/users', usersRoutes);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
