const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const STRAVA_API_URL = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/token";

// Function to refresh Strava Access Token
const refreshStravaToken = async () => {
  try {
    const response = await axios.post(STRAVA_AUTH_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    // Save new tokens to .env (or use a database)
    fs.writeFileSync(
      ".env",
      `STRAVA_ACCESS_TOKEN=${newAccessToken}\nSTRAVA_REFRESH_TOKEN=${newRefreshToken}\nSTRAVA_CLIENT_ID=${process.env.STRAVA_CLIENT_ID}\nSTRAVA_CLIENT_SECRET=${process.env.STRAVA_CLIENT_SECRET}`
    );

    console.log("✅ Strava Access Token Refreshed");
    return newAccessToken;
  } catch (error) {
    console.error("❌ Error refreshing Strava token:", error.response?.data || error);
    return null;
  }
};

// Function to make authenticated Strava API requests
const stravaRequest = async (endpoint) => {
  let token = process.env.STRAVA_ACCESS_TOKEN;
  try {
    const response = await axios.get(`${STRAVA_API_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("🔄 Token expired. Refreshing...");
      token = await refreshStravaToken();
      if (!token) return null;

      // Retry request with new token
      return stravaRequest(endpoint);
    }
    console.error(`❌ Error fetching Strava ${endpoint}:`, error.response?.data || error);
    return null;
  }
};

// Function to get Strava Runs
const getStravaRuns = async () => await stravaRequest("athlete/activities");

// Function to get Strava Profile
const getStravaProfile = async () => await stravaRequest("athlete");

module.exports = {
  getStravaRuns,
  getStravaProfile
};

// Test Strava API Calls
const testStravaAPI = async () => {
  console.log("Fetching Strava Profile...");
  console.log(await getStravaProfile());

  console.log("Fetching Strava Runs...");
  console.log(await getStravaRuns());
};

// Run test
testStravaAPI();
