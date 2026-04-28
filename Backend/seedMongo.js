const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://127.0.0.1:27017");

async function seedMongo() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("crsms");
    const servicesCollection = db.collection("services");

    await servicesCollection.deleteMany({});

    const services = [
      {
        name: "Leeds Housing Help",
        category: "Housing",
        description: "Help with homelessness and housing problems.",
        address: "City Centre",
        postcode: "LS1",
        phone: "0113 000 0000",
        website: "https://example.com"
      },
      {
        name: "Community Food Bank",
        category: "Food",
        description: "Food parcels and support for families.",
        address: "Leeds",
        postcode: "LS2",
        phone: "0113 111 1111",
        website: "https://example.com"
      },
      {
        name: "Wellbeing Support Line",
        category: "Mental Health",
        description: "Mental health support and crisis help.",
        address: "Leeds",
        postcode: "LS3",
        phone: "0113 222 2222",
        website: "https://example.com"
      },
      {
        name: "Money Advice Leeds",
        category: "Financial",
        description: "Support with budgeting, debt and financial advice.",
        address: "Leeds",
        postcode: "LS4",
        phone: "0113 333 3333",
        website: "https://example.com"
      },
      {
        name: "Youth Community Hub",
        category: "Youth",
        description: "Activities and support services for young people.",
        address: "Leeds",
        postcode: "LS5",
        phone: "0113 444 4444",
        website: "https://example.com"
      }
    ];

    await servicesCollection.insertMany(services);

    console.log("✅ MongoDB seed data added correctly.");
  } catch (err) {
    console.error("❌ Mongo seed error:", err.message);
  } finally {
    await client.close();
  }
}

seedMongo();


