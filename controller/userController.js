// const {
//   S3Client,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
// const pool = require("../conn/db");
// const redisClient = require("../utils/redisClient");
// const fs = require("fs");
// const { uploadToS3 } = require("../utils/s3Upload");

// const s3 = new S3Client({ region: process.env.AWS_REGION });

// console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
// console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY);

// // 🔹 Generate a temporary presigned URL
// async function generateSignedUrl(key) {
//   if (!key) return null;
//   const command = new GetObjectCommand({
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: key,
//   });
//   return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
// }

// // 🔹 Delete file from S3
// async function deleteFromS3(key) {
//   if (!key) return;
//   try {
//     const command = new DeleteObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//     });
//     await s3.send(command);
//   } catch (err) {
//     console.error("S3 Delete Error:", err);
//   }
// }

// // 🔹 GET all users
// // 🔹 GET all users
// async function getUsers(req, res) {
//   try {
//     const cache = await redisClient.get("users");
//     if (cache) {
//       return res.json({ source: "cache", data: JSON.parse(cache) });
//     }

//     const result = await pool.query("SELECT * FROM users ORDER BY id ASC");

//     for (const user of result.rows) {
//       if (user.image) {
//         user.image = await generateSignedUrl(user.image); // ✅ replaced image key with URL
//       } else {
//         user.image = null;
//       }
//     }

//     await redisClient.set("users", JSON.stringify(result.rows), { EX: 60 });
//     res.json({ source: "db", data: result.rows });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// }

// // 🔹 GET user by ID
// async function getUserById(req, res) {
//   try {
//     const { id } = req.params;
//     const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

//     if (result.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     const user = result.rows[0];
//     if (user.image) {
//       user.image = await generateSignedUrl(user.image); // replace key with URL
//     } else {
//       user.image = null;
//     }

//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// }

// // 🔹 CREATE user (with optional image)
// async function createUser(req, res) {
//   try {
//     const { name, email } = req.body;
//     let imageKey = null;

//     if (req.file) {
//       const key = `uploads/users/${Date.now()}_${req.file.originalname}`;
//       await uploadToS3(req.file.path, key);
//       imageKey = key;
//       fs.unlinkSync(req.file.path);
//     }

//     const result = await pool.query(
//       "INSERT INTO users (name, email, image) VALUES ($1, $2, $3) RETURNING *",
//       [name, email, imageKey]
//     );

//     const user = result.rows[0];
//     user.imageUrl = user.image ? await generateSignedUrl(user.image) : null;

//     await redisClient.del("users");
//     res.status(201).json(user);
//   } catch (err) {
//     console.error("Create User Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// }

// // 🔹 UPDATE user (replace image if new one uploaded)
// async function updateUser(req, res) {
//   try {
//     const { id } = req.params;
//     const { name, email } = req.body;

//     // Fetch old image before update
//     const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [
//       id,
//     ]);
//     if (existingUser.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     let imageKey = existingUser.rows[0].image;

//     // If new file uploaded → delete old image & upload new one
//     if (req.file) {
//       if (imageKey) await deleteFromS3(imageKey);

//       const newKey = `uploads/users/${Date.now()}_${req.file.originalname}`;
//       await uploadToS3(req.file.path, newKey);
//       imageKey = newKey;
//       fs.unlinkSync(req.file.path);
//     }

//     const result = await pool.query(
//       "UPDATE users SET name=$1, email=$2, image=$3 WHERE id=$4 RETURNING *",
//       [name, email, imageKey, id]
//     );

//     const user = result.rows[0];
//     user.imageUrl = user.image ? await generateSignedUrl(user.image) : null;

//     await redisClient.del("users");
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// }

// // 🔹 DELETE user (remove image from S3)
// async function deleteUser(req, res) {
//   try {
//     const { id } = req.params;

//     const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [
//       id,
//     ]);
//     if (existingUser.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     const imageKey = existingUser.rows[0].image;
//     if (imageKey) await deleteFromS3(imageKey);

//     await pool.query("DELETE FROM users WHERE id = $1", [id]);
//     await redisClient.del("users");

//     res.json({ message: "User deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// }

// module.exports = {
//   getUsers,
//   getUserById,
//   createUser,
//   updateUser,
//   deleteUser,
// };

const {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const pool = require("../conn/db");
const redisClient = require("../utils/redisClient");
const fs = require("fs");
const { uploadToS3 } = require("../utils/s3Upload");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY);

// 🔹 Generate presigned URL
async function generateSignedUrl(key) {
  if (!key) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  } catch (err) {
    console.error("Signed URL Error:", err);
    return null;
  }
}

// 🔹 Delete file from S3
async function deleteFromS3(key) {
  if (!key) return;
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    await s3.send(command);
  } catch (err) {
    console.error("S3 Delete Error:", err);
  }
}

// 🔹 GET all users
async function getUsers(req, res) {
  try {
    const cache = await redisClient.get("users");
    if (cache) {
      return res.json({ source: "cache", data: JSON.parse(cache) });
    }

    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");

    // Replace image key with signed URL
    for (const user of result.rows) {
      user.image = user.image ? await generateSignedUrl(user.image) : null;
    }

    await redisClient.set("users", JSON.stringify(result.rows), { EX: 60 });
    res.json({ source: "db", data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🔹 GET user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result.rows[0];
    user.image = user.image ? await generateSignedUrl(user.image) : null;

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🔹 CREATE user (with optional image)
async function createUser(req, res) {
  try {
    const { name, email } = req.body;
    let imageKey = null;

    if (req.file) {
      const key = `uploads/users/${Date.now()}_${req.file.originalname}`;
      await uploadToS3(req.file.path, key);
      imageKey = key;
      fs.unlinkSync(req.file.path);
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, image) VALUES ($1, $2, $3) RETURNING *",
      [name, email, imageKey]
    );

    const user = result.rows[0];
    // ✅ Replace image with signed URL instead of adding imageUrl
    user.image = user.image ? await generateSignedUrl(user.image) : null;

    await redisClient.del("users");
    res.status(201).json(user);
  } catch (err) {
    console.error("Create User Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// 🔹 UPDATE user
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (existingUser.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    let imageKey = existingUser.rows[0].image;

    if (req.file) {
      // delete old image if exists
      if (imageKey) await deleteFromS3(imageKey);

      const newKey = `uploads/users/${Date.now()}_${req.file.originalname}`;
      await uploadToS3(req.file.path, newKey);
      imageKey = newKey;
      fs.unlinkSync(req.file.path);
    }

    const result = await pool.query(
      "UPDATE users SET name=$1, email=$2, image=$3 WHERE id=$4 RETURNING *",
      [name, email, imageKey, id]
    );

    const user = result.rows[0];
    user.image = user.image ? await generateSignedUrl(user.image) : null;

    await redisClient.del("users");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🔹 DELETE user
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (existingUser.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const imageKey = existingUser.rows[0].image;
    if (imageKey) await deleteFromS3(imageKey);

    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    await redisClient.del("users");

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
