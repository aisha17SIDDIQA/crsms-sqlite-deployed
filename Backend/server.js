const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

const express = require("express");
const cors = require("cors");
const db = require("./db");
const { MongoClient } = require("mongodb");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017"
);
const TEST_MODE = process.env.TEST_MODE || "mongo";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let usersCollection;
let requestsCollection;

async function connectMongo() {
  await client.connect();

  const dbMongo = client.db("crsms");

  usersCollection = dbMongo.collection("users");
  requestsCollection = dbMongo.collection("support_requests");

  console.log("✅ MongoDB connected");
}

/* ================= SERVICES ================= */

app.get("/api/services", (req, res) => {
  const { category, postcode, search } = req.query;

  let sql = "SELECT * FROM services WHERE 1=1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (postcode) {
    sql += " AND postcode = ?";
    params.push(postcode);
  }

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ? OR address LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "SQLite error" });
    res.json(rows);
  });
});

/* ================= CREATE REQUEST ================= */

app.post("/api/requests", async (req, res) => {
  const { name, email, message } = req.body;
  const createdAt = new Date();

  const existingUser = await usersCollection.findOne({ email });
  const isRegisteredUser = !!existingUser;

  if (TEST_MODE === "sqlite") {
    const start = Date.now();

    db.run(
      `
      INSERT INTO support_requests 
      (name, email, message, createdAt, isRegisteredUser)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        name,
        email,
        message,
        createdAt.toISOString(),
        isRegisteredUser ? 1 : 0,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: "SQLite failed" });

        console.log("🟦 SQLite request:", Date.now() - start, "ms");
        res.json({ message: "Sent ✅" });
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const start = Date.now();

    await requestsCollection.insertOne({
      name,
      email,
      message,
      createdAt,
      isRegisteredUser,
    });

    console.log("🟩 Mongo request:", Date.now() - start, "ms");
    res.json({ message: "Sent ✅" });
  }
});

/* ================= USER REQUESTS ================= */

app.get("/api/my-requests", async (req, res) => {
  const { email } = req.query;

  if (TEST_MODE === "sqlite") {
    db.all(
      "SELECT * FROM support_requests WHERE email = ? ORDER BY id DESC",
      [email],
      (err, rows) => {
        res.json(rows);
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const requests = await requestsCollection
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  }
});

/* ================= ADMIN ================= */

app.get("/api/admin/requests", async (req, res) => {
  if (TEST_MODE === "sqlite") {
    db.all(
      "SELECT * FROM support_requests ORDER BY id DESC",
      [],
      (err, rows) => {
        res.json(rows);
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const requests = await requestsCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  }
});

/* ================= CHAT ================= */

app.get("/api/chat", async (req, res) => {
  const { email } = req.query;

  if (TEST_MODE === "sqlite") {
    db.all(
      "SELECT * FROM messages WHERE email = ? ORDER BY id ASC",
      [email],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(rows);
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const messages = await client
      .db("crsms")
      .collection("messages")
      .find({ email })
      .sort({ createdAt: 1 })
      .toArray();

    res.json(messages);
  }
});

app.get("/api/chat-users", async (req, res) => {
  if (TEST_MODE === "sqlite") {
    db.all(
      "SELECT DISTINCT email FROM messages ORDER BY email ASC",
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(rows);
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const users = await client
      .db("crsms")
      .collection("messages")
      .distinct("email");

    users.sort();

    res.json(users.map((email) => ({ email })));
  }
});

/* ================= REGISTER ================= */

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const createdAt = new Date();

  if (TEST_MODE === "sqlite") {
    const start = Date.now();

    db.run(
      `
      INSERT INTO users 
      (name, email, password, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, email, hashed, "user", createdAt.toISOString()],
      function (err) {
        if (err) return res.status(500).json({ error: "SQLite failed" });

        console.log("🟦 SQLite register:", Date.now() - start, "ms");
        res.json({ message: "Registered (SQLite)" });
      }
    );
  }

  if (TEST_MODE === "mongo") {
    const start = Date.now();

    await usersCollection.insertOne({
      name,
      email,
      password: hashed,
      role: "user",
      createdAt,
    });

    console.log("🟩 Mongo register:", Date.now() - start, "ms");
    res.json({ message: "Registered (Mongo)" });
  }
});

/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  let user;

  const fetchStart = Date.now();

  if (TEST_MODE === "sqlite") {
    user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  if (TEST_MODE === "mongo") {
    user = await usersCollection.findOne({ email });
  }

  const fetchTime = Date.now() - fetchStart;

  if (!user) return res.status(401).json({ error: "Invalid" });

  const bcryptStart = Date.now();
  const match = await bcrypt.compare(password, user.password);
  const bcryptTime = Date.now() - bcryptStart;

  if (!match) return res.status(401).json({ error: "Invalid" });

  const totalTime = fetchTime + bcryptTime;

  console.log("⚡ Fetch:", fetchTime, "ms");
  console.log("🔐 Bcrypt:", bcryptTime, "ms");
  console.log("🚀 Total login:", totalTime, "ms");

const createdAt = new Date();

if (TEST_MODE === "sqlite") {
  db.run(
    `INSERT INTO logs (type, email, action, createdAt)
     VALUES (?, ?, ?, ?)`,
    ["auth", email, "login", createdAt.toISOString()]
  );
}

if (TEST_MODE === "mongo") {
  await client.db("crsms").collection("logs").insertOne({
    type: "auth",
    email,
    action: "login",
    fetchTime,
    bcryptTime,
    totalTime,
    createdAt
  });
}

  res.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
    performance: {
      fetchTime,
      bcryptTime,
      totalTime,
    },
  });
});

/* ================= SAVE DISTANCE SEARCH LOG ================= */

app.post("/api/search-log", async (req, res) => {
  const { postcode, category, results, executionTimeMs } = req.body;
  const createdAt = new Date();

  if (TEST_MODE === "sqlite") {
    const start = Date.now();

    const stmt = db.prepare(
      `
      INSERT INTO search_logs 
      (postcode, category, serviceName, servicePostcode, distanceKm, executionTimeMs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    );

    results.forEach((r) => {
      stmt.run(
        postcode,
        category,
        r.serviceName,
        r.servicePostcode || "",
        r.distanceKm,
        executionTimeMs,
        createdAt.toISOString()
      );
    });

    stmt.finalize();

    console.log("🟦 SQLite search:", Date.now() - start, "ms");
  }

  if (TEST_MODE === "mongo") {
    const start = Date.now();

    await client
      .db("crsms")
      .collection("search_logs")
      .insertMany(
        results.map((r) => ({
          postcode,
          category,
          serviceName: r.serviceName,
          servicePostcode: r.servicePostcode || "",
          distanceKm: r.distanceKm,
          executionTimeMs,
          createdAt,
        }))
      );

    console.log("🟩 Mongo search:", Date.now() - start, "ms");
  }

  res.json({ message: "Logged ✅" });
});

/* ================= SOCKET.IO ================= */

io.on("connection", (socket) => {
  socket.on("join", (email) => {
    socket.join(email);
  });

  socket.on("send_message", async (data) => {
    const createdAt = new Date();

    if (TEST_MODE === "sqlite") {
      const start = Date.now();

      db.run(
        `
        INSERT INTO messages 
        (email, sender, message, createdAt)
        VALUES (?, ?, ?, ?)
        `,
        [data.email, data.sender, data.message, createdAt.toISOString()],
        function () {
          console.log("🟦 SQLite message:", Date.now() - start, "ms");
        }
      );
    }

    if (TEST_MODE === "mongo") {
      const start = Date.now();

      await client.db("crsms").collection("messages").insertOne({
        email: data.email,
        sender: data.sender,
        message: data.message,
        createdAt,
      });

      console.log("🟩 Mongo message:", Date.now() - start, "ms");
    }

    io.to(data.email).emit("receive_message", data);
  });

  socket.on("admin_reply", async (data) => {
    const { email, reply } = data;
    const createdAt = new Date();

    if (TEST_MODE === "sqlite") {
      const start = Date.now();

      db.run(
        `
        INSERT INTO messages 
        (email, sender, message, createdAt)
        VALUES (?, ?, ?, ?)
        `,
        [email, "admin", reply, createdAt.toISOString()],
        function () {
          console.log("🟦 SQLite admin reply:", Date.now() - start, "ms");
        }
      );
    }

    if (TEST_MODE === "mongo") {
      const start = Date.now();

      await client.db("crsms").collection("messages").insertOne({
        email,
        sender: "admin",
        message: reply,
        createdAt,
      });

      console.log("🟩 Mongo admin reply:", Date.now() - start, "ms");
    }

    io.to(email).emit("receive_reply", {
      email,
      reply,
      sender: "admin",
    });
  });

  socket.on("typing", async (data) => {
    const createdAt = new Date();

    if (TEST_MODE === "sqlite") {
      const start = Date.now();

      db.run(
        `
        INSERT INTO typing_logs 
        (email, sender, event, createdAt)
        VALUES (?, ?, ?, ?)
        `,
        [data.email, data.sender, "typing", createdAt.toISOString()],
        function () {
          console.log("🟦 SQLite typing:", Date.now() - start, "ms");
        }
      );
    }

    if (TEST_MODE === "mongo") {
      const start = Date.now();

      await client.db("crsms").collection("typing_logs").insertOne({
        email: data.email,
        sender: data.sender,
        event: "typing",
        createdAt,
      });

      console.log("🟩 Mongo typing:", Date.now() - start, "ms");
    }

    socket.to(data.email).emit("typing", data);
  });

  socket.on("stop_typing", async (data) => {
    const createdAt = new Date();

    if (TEST_MODE === "sqlite") {
      const start = Date.now();

      db.run(
        `
        INSERT INTO typing_logs 
        (email, sender, event, createdAt)
        VALUES (?, ?, ?, ?)
        `,
        [data.email, data.sender, "stop_typing", createdAt.toISOString()],
        function () {
          console.log("🟦 SQLite stop typing:", Date.now() - start, "ms");
        }
      );
    }

    if (TEST_MODE === "mongo") {
      const start = Date.now();

      await client.db("crsms").collection("typing_logs").insertOne({
        email: data.email,
        sender: data.sender,
        event: "stop_typing",
        createdAt,
      });

      console.log("🟩 Mongo stop typing:", Date.now() - start, "ms");
    }

    socket.to(data.email).emit("stop_typing", data);
  });
});

/* ================= START ================= */

async function startServer() {
 if (TEST_MODE === "mongo") {
  await connectMongo();
}

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();