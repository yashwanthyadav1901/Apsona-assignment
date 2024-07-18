require("dotenv").config();
const express = require("express");
const connectDB = require("./config/dbConfig");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const cron = require("node-cron");
port = process.env.PORT;

connectDB();

app.use(express.json());
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const result = await Note.deleteMany({
      isTrashed: true,
      trashUntil: { $lte: now },
    });
    console.log(`Deleted ${result.deletedCount} trashed notes`);
  } catch (error) {
    console.error("Error deleting trashed notes:", error);
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/note", require("./routes/noteRoutes"));
app.use("/user", require("./routes/userRoutes"));

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
