import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.status(200).json({ message: "request services." });
});

app.listen(8001, () => {
  console.log("app is listening on port 8001");
});
