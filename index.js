require("dotenv").config();
const express = require("express");
const connectDB = require("./config/dbConfig");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
port = process.env.PORT;

connectDB();

app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 not found" });
  } else {
    res.type("txt").send("404 not found");
  }
});

mongoose.connection.once("open", () => {
  console.log("database connected");
  app.listen(port, () => {
    console.log(`server listening on port ${port}`);
  });
});

mongoose.connection.on("error", () => {
  console.log(err);
});
