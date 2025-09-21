const pool = require("../conn/db");
const redisClient = require("../utils/redisClient");

// GET all users
async function getUsers(req, res) {
  try {
    const cache = await redisClient.get("users");
    if (cache) {
      return res.json({ source: "cache", data: JSON.parse(cache) });
    }

    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    await redisClient.set("users", JSON.stringify(result.rows), { EX: 60 });
    res.json({ source: "db", data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE user
async function createUser(req, res) {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );
    await redisClient.del("users"); // clear cache
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// UPDATE user
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const result = await pool.query(
      "UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING *",
      [name, email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    await redisClient.del("users"); // clear cache
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE user
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    await redisClient.del("users"); // clear cache
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
