require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const supabase = require('./supabaseClient');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(cors());

// Make io accessible in all route files via req.app.get('io')
app.set('io', io);

// ─── Supabase real-time listeners ─────────────────────────────────────────────
// Listens for any change on rides OR messages and pushes to all connected clients.
// rides-update → RideFeed.jsx handles this
// new-message  → Conversation.jsx / Messages.jsx handles this
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' },
    (payload) => {
      console.log('Rides change detected:', payload.eventType);
      io.emit('rides-update', payload);
    })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('New message detected');
      // This is a backup in case the HTTP route's socket emit fails.
      // The route already emits 'new-message' directly after insert.
    })
  .subscribe((status) => {
    console.log('Supabase realtime status:', status);
  });

const rideRoutes = require('./routes/rides');
const messageRoutes = require('./routes/messages');

app.use('/api/rides', rideRoutes);
app.use('/api/messages', messageRoutes);


const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});