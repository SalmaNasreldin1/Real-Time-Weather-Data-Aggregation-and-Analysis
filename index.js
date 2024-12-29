require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

const app = express();
const port = 4000;

// Middleware
app.use(bodyParser.json());

// Ensure the table exists
const initializeDatabase = async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS weather_data (
        id SERIAL PRIMARY KEY,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        temperature FLOAT NOT NULL,
        humidity INT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Table 'weather_data' is ready.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

// Call the function to initialize the database
initializeDatabase();


// Error-handling middleware for invalid JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      console.error("Bad JSON received:", err.message);
      return res.status(400).json({ error: "Invalid JSON payload." });
    }
    next();
  });

// POST endpoint for data submission
app.post("/data", async (req, res) => {
  const { latitude, longitude, temperature, humidity } = req.body;

  // Validate input
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof temperature !== "number" ||
    typeof humidity !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input. Please provide valid data." });
  }

  try {
    const result = await sql`
      INSERT INTO weather_data (latitude, longitude, temperature, humidity)
      VALUES (${latitude}, ${longitude}, ${temperature}, ${humidity})
      RETURNING id;
    `;
    const insertedId = result[0]?.id;
    res.status(201).json({ message: "Data submitted successfully", id: insertedId });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ error: "An error occurred while saving data." });
  }
});


// GET endpoint to retrieve all weather data
app.get("/data", async (req, res) => {
    try {
      const result = await sql`SELECT * FROM weather_data ORDER BY submitted_at DESC;`;
      res.status(200).json(result);
    } catch (err) {
      console.error("Error retrieving data:", err);
      res.status(500).json({ error: "An error occurred while retrieving data." });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
