const { google } = require("googleapis");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const MAX_RETRIES = 3;

// Load Google Service Account Credentials from JSON file
const keyFile = path.join(__dirname, "ai-coach-453823-aff8958abcdc.json");

// Authenticate with Google
const getGoogleAuth = () => {
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: SCOPES,
  });
};

// Google Calendar Instance
const calendar = google.calendar({ version: "v3", auth: getGoogleAuth() });

// General Google API Request Handler with Retries
const googleApiRequest = async (requestFunction, retries = 0) => {
  try {
    return await requestFunction();
  } catch (error) {
    const status = error.response?.status;

    if (status === 401) {
      console.log("🔄 Google Auth Expired. Refreshing Authentication...");
      calendar.auth = getGoogleAuth(); // Refresh authentication
      return googleApiRequest(requestFunction, retries + 1);
    }

    if ((status === 429 || status >= 500) && retries < MAX_RETRIES) {
      console.log(`⏳ Google API Rate Limit/Error. Retrying (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retrying
      return googleApiRequest(requestFunction, retries + 1);
    }

    console.error("❌ Google API Error:", error.response?.data || error.message);
    return null;
  }
};

// Function to List All Calendars
const listCalendars = async () => {
  return googleApiRequest(async () => {
    const res = await calendar.calendarList.list();
    const calendars = res.data.items;
    if (calendars.length) {
      console.log("✅ Available calendars:");
      calendars.forEach((cal) => console.log(`${cal.id} - ${cal.summary}`));
    } else {
      console.log("⚠️ No calendars found.");
    }
    return calendars;
  });
};

// Function to List Calendar Events
const listEvents = async (calendarId) => {
  return googleApiRequest(async () => {
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
      timeMax: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items;
    if (events.length) {
      console.log("✅ Upcoming 10 events:");
      events.forEach((event) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log("⚠️ No upcoming events found.");
    }
    return events;
  });
};

// Function to Add Training Session to Google Calendar
const addTrainingSession = async (summary, date, time) => {
  return googleApiRequest(async () => {
    const event = {
      summary,
      start: {
        dateTime: `${date}T${time}:00`,
        timeZone: "America/Los_Angeles",
      },
      end: {
        dateTime: `${date}T${time}:00`,
        timeZone: "America/Los_Angeles",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "bueno8485@gmail.com",
      resource: event,
    });

    console.log(`✅ Training session added: ${response.data.htmlLink}`);
    return response.data;
  });
};

// Aggregate Google Calendar Data
const getGoogleCalendarData = async () => {
  const calendars = await listCalendars();
  const events = await listEvents("bueno8485@gmail.com");
  return { calendars, events };
};

// Test Google Calendar API Calls
const testGoogleAPI = async () => {
  console.log("Fetching Google Calendar Data...");
  const data = await getGoogleCalendarData();
  console.log(JSON.stringify(data, null, 2));
};

// Run test
testGoogleAPI();

module.exports = {
  addTrainingSession,
  listCalendars,
  listEvents,
  getGoogleCalendarData,
};
