const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controller/userController");

const upload = require("../middlewares/upload");

const router = express.Router();

router.get("/", getUsers);
router.get("/:id", getUserById);

// 👇 Allow image upload on user creation
router.post("/", upload.single("image"), createUser);

// 👇 Allow image upload on user update
router.put("/:id", upload.single("image"), updateUser);

router.delete("/:id", deleteUser);

module.exports = router;
