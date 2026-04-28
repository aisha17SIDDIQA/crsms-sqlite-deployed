const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "crsms.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to SQLite database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category TEXT,
      description TEXT,
      address TEXT,
      postcode TEXT,
      phone TEXT,
      website TEXT
    )
  `);

db.run(`
  CREATE TABLE IF NOT EXISTS support_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    createdAt TEXT,
    isRegisteredUser INTEGER DEFAULT 0
  )
`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      createdAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      email TEXT,
      action TEXT,
      createdAt TEXT
    )
  `);

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  sender TEXT,
  senderEmail TEXT,
  receiverEmail TEXT,
  message TEXT,
  createdAt TEXT
)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postcode TEXT,
  category TEXT,
  serviceName TEXT,
  servicePostcode TEXT,
  distanceKm REAL,
  executionTimeMs REAL,
  createdAt TEXT
)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS typing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  sender TEXT,
  event TEXT,
  createdAt TEXT
)
`);

});

module.exports = db;
