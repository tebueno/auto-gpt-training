const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const WHOOP_API_URL = "https://api.prod.whoop.com/developer/v1";

const refreshWhoopToken = async () => {
  try {
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

    // Update the .env file with new tokens
    const envContent = `
OPENAI_API_KEY=${process.env.OPENAI_API_KEY}
STRAVA_CLIENT_ID=${process.env.STRAVA_CLIENT_ID}
STRAVA_CLIENT_SECRET=${process.env.STRAVA_CLIENT_SECRET}
STRAVA_ACCESS_TOKEN=${process.env.STRAVA_ACCESS_TOKEN}
CLIENT_ID=${process.env.CLIENT_ID}
CLIENT_SECRET=${process.env.CLIENT_SECRET}
REDIRECT_URI=${process.env.REDIRECT_URI}
WHOOP_API_HOSTNAME=${process.env.WHOOP_API_HOSTNAME}
WHOOP_ACCESS_TOKEN=${newAccessToken}
WHOOP_REFRESH_TOKEN=${newRefreshToken}
    `.trim();

    fs.writeFileSync(".env", envContent);

    console.log("✅ WHOOP Access Token Refreshed");
    return newAccessToken;
  } catch (error) {
    console.error("❌ Error refreshing WHOOP token:", error.response?.data || error);
    return null;
  }
};

const whoopRequest = async (endpoint) => {
  let token = process.env.WHOOP_ACCESS_TOKEN;
    try {
    const response = await axios.get(`${WHOOP_API_URL}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ WHOOP ${endpoint} fetched successfully`, response.data);
        return response.data.records;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("🔄 Token expired. Refreshing...");
      token = await refreshWhoopToken();
      if (!token) return null;
      return whoopRequest(endpoint);
    }
    console.error(`❌ Error fetching WHOOP ${endpoint}:`, error.response?.data || error);
    return null;
  }
};

const getWhoopRecovery = async () => await whoopRequest("recovery");
const getWhoopStrain = async () => await whoopRequest("activity/workout");

module.exports = {
  getWhoopRecovery,
  getWhoopStrain
};

const testWhoopAPI = async () => {
  //console.log("Fetching WHOOP Recovery...");
    await getWhoopRecovery();

    await getWhoopStrain();
};

testWhoopAPI();
