const express = require("express");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes.js");

const app = express();
app.use(express.json());

app.use("/users", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on ${PORT}`);
});
