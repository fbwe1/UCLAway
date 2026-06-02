require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { startCronJobs } = require("./cron");

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

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

// Routes
const rideRoutes = require('./routes/rides');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profileRoutes');

app.use('/api/rides', rideRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  startCronJobs(io); 
});