require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const supabase = require("./supabaseClient");

const rideRoutes = require("./routes/rides");
const profileRoutes = require("./routes/profileRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UCLAway backend is running");
});

// Real-time Supabase listener
supabase
  .channel("rides-server")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "rides" },
    (payload) => {
      console.log("Supabase change detected:", payload.eventType);
      io.emit("rides-update", payload);
    }
  )
  .subscribe((status) => {
    console.log("Supabase realtime status:", status);
  });

// Routes
app.use("/api/rides", rideRoutes);
app.use("/api/profile", profileRoutes);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});