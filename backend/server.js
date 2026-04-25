const express = require('express');
const app = express();
//since we haven't officially started building, I just made this similar to the node.js tutorial as a skeleton
app.get("/", (req, res) => {
    res.send("UCLAway backend is running");
  });
app.listen(3001, () => {
    console.log('Server is running on port 3001'); // testing
});

