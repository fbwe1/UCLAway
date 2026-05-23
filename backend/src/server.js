const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require("./routes/authRoutes")
//since we haven't officially started building, I just made this similar to the node.js tutorial as a skeleton
app.use(cors());
app.use(express.json())
app.get("/", (req, res) => {
    res.send("UCLAway backend is running");
  });
app.use("/auth", authRoutes);

app.listen(3001, () => {
    console.log('Server is running on port 3001'); // testing
});

