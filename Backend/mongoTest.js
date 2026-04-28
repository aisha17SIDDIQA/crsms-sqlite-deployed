const { MongoClient } = require("mongodb");

const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("crsms");
    const collection = db.collection("services");

    // Insert test data
    await collection.insertOne({
      name: "Mongo Housing Help",
      category: "Housing",
      postcode: "LS1"
    });

    console.log("✅ Data inserted");

    // Fetch data
    const data = await collection.find().toArray();
    console.log("📦 Data from MongoDB:", data);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();


