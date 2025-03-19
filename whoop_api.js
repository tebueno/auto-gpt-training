const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const WHOOP_API_URL = "https://api.prod.whoop.com/developer/v1";
const MAX_RETRIES = 3;

// WHOOP Sport ID to Activity Name Mapping
const WHOOP_SPORTS = {
  "-1": "Activity",
  0: "Running",
  1: "Cycling",
  16: "Baseball",
  17: "Basketball",
  18: "Rowing",
  19: "Fencing",
  20: "Field Hockey",
  21: "Football",
  22: "Golf",
  24: "Ice Hockey",
  25: "Lacrosse",
  27: "Rugby",
};

/**
 * Refresh WHOOP Access Token
 * This function refreshes the WHOOP API access token when it expires.
 */
const refreshWhoopToken = async () => {
  try {
    console.log("🔄 Refreshing WHOOP Access Token...");

    const response = await axios.post(
      "https://api.prod.whoop.com/oauth/oauth2/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.WHOOP_REFRESH_TOKEN,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    updateEnvFile(newAccessToken, newRefreshToken);
    console.log("✅ WHOOP Access Token Refreshed");
    return newAccessToken;
  } catch (error) {
    console.error("❌ WHOOP Refresh Token Expired. Manual reauthentication required.");
    process.exit(1);
  }
};

/**
 * Update .env file with new WHOOP tokens
 */
const updateEnvFile = (newAccessToken, newRefreshToken) => {
    const envConfig = dotenv.parse(fs.readFileSync(".env"));
    envConfig.WHOOP_ACCESS_TOKEN = newAccessToken;
    envConfig.WHOOP_REFRESH_TOKEN = newRefreshToken;

    const updatedEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

    fs.writeFileSync(".env", updatedEnvContent);
};

/**
 * WHOOP API Request Handler with Retry Logic
 */
const whoopRequest = async (endpoint, retries = 0) => {
  let token = process.env.WHOOP_ACCESS_TOKEN;

  try {
    const response = await axios.get(`${WHOOP_API_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ WHOOP ${endpoint} fetched successfully`);
    return response.data.records;
  } catch (error) {
    if (error.response?.status === 401) {
      if (retries === 0) console.log("🔄 Token expired. Refreshing...");
      token = await refreshWhoopToken();
      if (!token) return null;
      return whoopRequest(endpoint, retries + 1);
    }

    if (error.response?.status === 429 && retries < MAX_RETRIES) {
      console.log(`⏳ Rate limited. Retrying (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return whoopRequest(endpoint, retries + 1);
    }

    console.error(`❌ WHOOP API Error (${endpoint}):`, error.response?.data || error);
    return null;
  }
};

/**
 * Fetch WHOOP Recovery Data
 */
const getWhoopRecovery = async () => await whoopRequest("recovery");

/**
 * Fetch WHOOP Workouts with Sport Mapping & Date
 */
const getWhoopWorkouts = async () => {
  const data = await whoopRequest("activity/workout");
  if (!data) return [];
  return data.map((workout) => ({
    activity_type: WHOOP_SPORTS[workout.sport_id] || "Unknown",
    start_time: workout.start,
    strain_score: workout.score?.strain || "N/A",
    average_heart_rate: workout.score?.average_heart_rate || "N/A",
    max_heart_rate: workout.score?.max_heart_rate || "N/A",
  }));
};

/**
 * Fetch WHOOP Sleep Data
 */
const getWhoopSleep = async () => await whoopRequest("activity/sleep");

/**
 * Fetch WHOOP Strain Data
 */
const getWhoopStrain = async () => await whoopRequest("cycle");

/**
 * Fetch WHOOP Body Measurements
 */
const getWhoopBodyMeasurements = async () => await whoopRequest("user/measurement/body");

/**
 * Fetch All WHOOP Data
 */
const getWhoopData = async () => {
  return {
    recovery: await getWhoopRecovery(),
    sleep: await getWhoopSleep(),
    workouts: await getWhoopWorkouts(),
    strain: await getWhoopStrain(),
    body: await getWhoopBodyMeasurements(),
  };
};

module.exports = {
  getWhoopRecovery,
  getWhoopWorkouts,
  getWhoopSleep,
  getWhoopStrain,
  getWhoopBodyMeasurements,
  getWhoopData,
};

/**
 * Test WHOOP API Fetching
 */
/*const testWhoopAPI = async () => {
  console.log("Fetching WHOOP Data...");
  const data = await getWhoopData();
  console.log(JSON.stringify(data, null, 2));
};

testWhoopAPI();*/
