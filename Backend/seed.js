const db = require("./db");

db.serialize(() => {
  db.run("DELETE FROM services");

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

  const stmt = db.prepare(`
    INSERT INTO services (name, category, description, address, postcode, phone, website)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  services.forEach((s) => {
    stmt.run(
      s.name,
      s.category,
      s.description,
      s.address,
      s.postcode,
      s.phone,
      s.website
    );
  });

  stmt.finalize(() => {
    console.log("✅ SQLite seed data added correctly.");
    process.exit(0);
  });
});
