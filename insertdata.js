const fs = require("fs");
const axios = require("axios"); // For making HTTP requests to your server endpoint

const jsonFile = "./AEEGSA.json"; // Path to your JSON file

// Load the JSON file
const cities = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

// Function to generate realistic random values
const generateRandomWeather = () => {
  const temperature = (Math.random() * 60 - 20).toFixed(1); // Temperature: -20°C to 40°C
  const humidity = Math.floor(Math.random() * 101); // Humidity: 0% to 100%
  return { temperature: parseFloat(temperature), humidity };
};

// Insert data into the database
const insertData = async () => {
  for (const city of cities) {
    const { lat, lon } = city; // Extract latitude and longitude
    const { temperature, humidity } = generateRandomWeather();

    try {
      const response = await axios.post("http://localhost:4000/data", {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        temperature,
        humidity,
      });
      console.log(`Inserted data for ${city.name}:`, response.data);
    } catch (error) {
      console.error(`Error inserting data for ${city.name}:`, error.message);
    }
  }
};

// Run the insertion
insertData();
