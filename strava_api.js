const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const STRAVA_API_URL = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/token";
const MAX_RETRIES = 3;

// Function to refresh Strava Access Token
const refreshStravaToken = async () => {
  try {
    console.log("🔄 Refreshing Strava Access Token...");

    const response = await axios.post(STRAVA_AUTH_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    console.log(`✅ New Access Token: ${newAccessToken}`);
    console.log(`✅ New Refresh Token: ${newRefreshToken}`);

    // Update .env file with new tokens
    const envConfig = dotenv.parse(fs.readFileSync(".env"));
    envConfig.STRAVA_ACCESS_TOKEN = newAccessToken;
    envConfig.STRAVA_REFRESH_TOKEN = newRefreshToken;

    const updatedEnvContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    fs.writeFileSync(".env", updatedEnvContent);
    console.log("✅ Strava Access Token Refreshed and saved to .env");

    // **Manually update process.env**
    process.env.STRAVA_ACCESS_TOKEN = newAccessToken;
    process.env.STRAVA_REFRESH_TOKEN = newRefreshToken;

    return newAccessToken;
  } catch (error) {
    if (error.response?.data?.errors?.some(e => e.code === 'invalid' && e.field === 'refresh_token')) {
      console.error("❌ Invalid refresh token. Please check your STRAVA_REFRESH_TOKEN in the .env file.");
    } else {
      console.error("❌ Error refreshing Strava token:", error.response?.data || error);
    }
    return null;
  }
};

// General Strava API Request Handler with Retries
const stravaRequest = async (endpoint, retries = 0) => {
  let token = process.env.STRAVA_ACCESS_TOKEN;
  
  console.log(`🔍 Making request to Strava endpoint: ${endpoint}, Retry: ${retries}, Token: ${token?.slice(0, 10)}...`);

  try {
    const response = await axios.get(`${STRAVA_API_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Strava ${endpoint} fetched successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      if (retries >= MAX_RETRIES) {
        console.error("❌ Max retries reached. Unable to refresh token.");
        return null;
      }

      console.log("🔄 Token expired. Refreshing...");
      token = await refreshStravaToken();
      if (!token) return null;

      console.log(`🔁 Retrying Strava request to ${endpoint} with new token...`);
      return stravaRequest(endpoint, retries + 1);
    }

    if (error.response?.status === 429 && retries < MAX_RETRIES) {
      console.log(`⏳ Rate limited. Retrying (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return stravaRequest(endpoint, retries + 1);
    }

    console.error(`❌ Strava API Error (${endpoint}):`, error.response?.data || error);
    return null;
  }
};

// Fetch Strava Profile Data
const getStravaProfile = async () => {
  const data = await stravaRequest("athlete");
  if (!data) return null;

  return {
    id: data.id,
    username: data.username || "N/A",
    first_name: data.firstname || "N/A",
    last_name: data.lastname || "N/A",
    city: data.city || "N/A",
    country: data.country || "N/A",
    sex: data.sex || "N/A",
  };
};

// Fetch Strava Runs
const getStravaRuns = async () => {
  const data = await stravaRequest("athlete/activities");
  if (!data || data.length === 0) return [];

  return data.map((run) => ({
    name: run.name,
    distance_km: (run.distance / 1000).toFixed(2),
    moving_time_min: (run.moving_time / 60).toFixed(2),
    start_date: run.start_date,
    average_speed_kph: (run.average_speed * 3.6).toFixed(2),
    max_speed_kph: (run.max_speed * 3.6).toFixed(2),
    elevation_gain_m: run.total_elevation_gain || 0,
  }));
};

// Aggregate Strava Data
const getStravaData = async () => {
  const profile = await getStravaProfile();
  const runs = await getStravaRuns();
  return { profile, runs };
};

module.exports = {
  getStravaProfile,
  getStravaRuns,
  getStravaData,
};

// Test Strava API Calls
const testStravaAPI = async () => {
  console.log("Fetching Strava Data...");
  const data = await getStravaData();
  console.log(JSON.stringify(data, null, 2));
};

// Run test
testStravaAPI();
