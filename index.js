require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { neon } = require("@neondatabase/serverless");
const fs = require('fs');
const path = require('path');

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

const getCitiesData = () => {
    try {
      const jsonData = fs.readFileSync(path.join(__dirname, 'AEEGSA.json'), 'utf8');
      return JSON.parse(jsonData);
    } catch (err) {
      console.error('Failed to read or parse the JSON file:', err);
      return [];
    }
  };

// Endpoint to get weather data by city name
app.get('/getWeatherByCity', async (req, res) => {
  const { city } = req.query;
  const cities = getCitiesData();
  const cityData = cities.find(c => c.name.toLowerCase() === city.toLowerCase());

  if (!cityData) {
    return res.status(404).json({ error: 'City not found' });
  }

  const { lat, lon , name} = cityData;
  try {
    const result = await sql`
      SELECT temperature ,humidity
      FROM weather_data
      ORDER BY ((latitude::float - ${lat}::float) * (latitude::float - ${lat}::float) + 
                (longitude::float - ${lon}::float) * (longitude::float - ${lon}::float)) ASC
      LIMIT 1;
    `;
    const ret = {
      ...result[0],
      city: name
      }
      res.status(200).json(ret);
  } catch (err) {
    console.error("Error querying weather data by city coordinates:", err);
    res.status(500).json({ error: "An error occurred during the SQL query." });
  }
});

app.get('/getWeatherByGeo', async (req, res) => {
  const { latitude, longitude, threshold = 10 } = req.query; // Default threshold to 10 km

  // Validate input
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Please provide both latitude and longitude.' });
  }

  try {
    // Use the Haversine formula to calculate distances and filter results by the threshold
    const result = await sql`
      SELECT latitude, longitude, temperature, humidity,
             LEAST(
               6371 * ACOS(
                 GREATEST(
                   -1,
                   LEAST(
                     1,
                     COS(RADIANS(${latitude}::float)) * COS(RADIANS(latitude::float)) *
                     COS(RADIANS(longitude::float) - RADIANS(${longitude}::float)) +
                     SIN(RADIANS(${latitude}::float)) * SIN(RADIANS(latitude::float))
                   )
                 )
               ),
               6371
             ) AS distance
      FROM weather_data
      WHERE
        LEAST(
          6371 * ACOS(
            GREATEST(
              -1,
              LEAST(
                1,
                COS(RADIANS(${latitude}::float)) * COS(RADIANS(latitude::float)) *
                COS(RADIANS(longitude::float) - RADIANS(${longitude}::float)) +
                SIN(RADIANS(${latitude}::float)) * SIN(RADIANS(latitude::float))
              )
            )
          ),
          6371
        ) <= ${threshold}
      ORDER BY distance ASC
      LIMIT 1;
    `;

    // Handle no results found
    if (result.length === 0) {
      return res.status(404).json({ error: "No weather data found within the specified radius." });
    }

    // Return the closest weather data point
    res.status(200).json({
      latitude: result[0].latitude,
      longitude: result[0].longitude,
      temperature: result[0].temperature,
      humidity: result[0].humidity,
      distance: result[0].distance,
    });
  } catch (err) {
    console.error("Error querying weather data by geo-location:", err);
    res.status(500).json({ error: "An error occurred during the SQL query." });
  }
});

// Endpoint to compute aggregated weather data
app.get('/getAggregatedWeather', async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  // Validate input
  if (!latitude || !longitude || !radius) {
    return res.status(400).json({ error: 'Please provide latitude, longitude, and radius.' });
  }

  try {
    const result = await sql`
      SELECT 
        AVG(temperature) AS avg_temperature,
        AVG(humidity) AS avg_humidity,
        VAR_POP(temperature) AS temperature_variance,
        VAR_POP(humidity) AS humidity_variance
      FROM weather_data
      WHERE 
        6371 * ACOS(
          GREATEST(
            -1,
            LEAST(
              1,
              COS(RADIANS(${latitude}::float)) * COS(RADIANS(latitude::float)) *
              COS(RADIANS(longitude::float) - RADIANS(${longitude}::float)) +
              SIN(RADIANS(${latitude}::float)) * SIN(RADIANS(latitude::float))
            )
          )
        ) <= ${radius};
    `;

    // Handle no results found
    if (!result[0] || Object.values(result[0]).some(value => value === null)) {
      return res.status(404).json({ error: 'No weather data found within the specified radius.' });
    }

    // Return aggregated data
    res.status(200).json(result[0]);
  } catch (err) {
    console.error("Error querying aggregated weather data:", err);
    res.status(500).json({ error: "An error occurred during the SQL query." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
