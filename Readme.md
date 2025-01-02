# **Project Title**: Real-Time Weather Data Aggregation and Analysis

---
## **Objective**  
Develop a web server in Node.js using Express to manage and analyze weather data collected from various geo-locations. The system should accept weather measurements, provide real-time query capabilities, and perform statistical analysis on the data.

---
## **Core Features**

### **1. Data Submission**  
- **Endpoint**: `/data`  
  - **Method**: `POST`  
  - **Functionality**: Accepts a single weather data point containing:  
    - `latitude`: Geo-location's latitude.  
    - `longitude`: Geo-location's longitude.  
    - `temperature`: Temperature in Celsius.  
    - `humidity`: Humidity percentage.  
  - **Example Request**:  
    ```json
    {
      "latitude": 51.5074,
      "longitude": -0.1278,
      "temperature": 15.5,
      "humidity": 80
    }
    ```  
  - **Response**: Confirms successful data submission.

---

### **2. Weather Data by City**  
- **Endpoint**: `/getWeatherByCity`  
  - **Method**: `POST`  
  - **Functionality**:  
    - Returns the temperature and humidity of the closest measured point to the center of a specified city.  
    - Ensures the point is beyond a minimum threshold distance from the city center.  
  - **Input Parameter**:  
    - `city` (string): Name of the city.  
  - **Response**:  
    ```json
    {
      "city": "London",
      "temperature": 15.5,
      "humidity": 80
    }
    ```  

---

### **3. Weather Data by Geo-Location**  
- **Endpoint**: `/getWeatherByGeo`  
  - **Method**: `POST`  
  - **Functionality**:  
    - Returns the temperature and humidity of the closest measured point to a specified geo-location.  
  - **Input Parameters**:  
    - `latitude` (float): Geo-location latitude.  
    - `longitude` (float): Geo-location longitude.  
  - **Response**:  
    ```json
    {
      "latitude": 51.5074,
      "longitude": -0.1278,
      "temperature": 15.5,
      "humidity": 80
    }
    ```  

---

### **4. Aggregated Weather Statistics**  
- **Endpoint**: `/getAggregatedWeather`  
  - **Method**: `POST`  
  - **Functionality**:  
    - Computes average temperature, average humidity, and their variances for all data points within a given radius of a specified geo-location.  
  - **Input Parameters**:  
    - `latitude` (float): Geo-location latitude.  
    - `longitude` (float): Geo-location longitude.  
    - `radius` (float): Search radius in kilometers.  
  - **Response**:  
    ```json
    {
      "avg_temperature": 16.2,
      "avg_humidity": 75,
      "temperature_variance": 1.3,
      "humidity_variance": 4.2
    }
    ```  

---

## **Implementation Details**

### **Distance Calculation**  
- Use the Haversine formula to compute distances between geo-locations.

---
## **Expected Deliverables**
1. **Web Application**: An Express server implementing all the above endpoints.
2. **Profiling**: Node Profiler 
3. **Sending Requests**: Curl, Artillery
4. **Monitoring**: pm2
5. **Documentation**: A README file with API usage instructions and example requests.  
