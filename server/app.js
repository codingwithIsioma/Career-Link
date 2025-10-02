const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const app = express();
const { port } = require("../config/dotenv");

// accepts requests from the frontend
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
// accept uploaded files
app.use(fileUpload());

// handles my routing
app.use("/api/v1", require("./routes"));

app.use("/", (req, res) => {
  res.send("This is the backend for my job n system.");
});

app.listen(port, () => {
  console.log("Server running on port ", port);
});
