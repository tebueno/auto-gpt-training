const { google } = require("googleapis");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Load Google Service Account Credentials from JSON file
const keyFile = path.join(__dirname, "ai-coach-453823-aff8958abcdc.json");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// Authenticate with Google
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: SCOPES,
});

const calendar = google.calendar({ version: "v3", auth });

// Function to List All Calendars
const listCalendars = async () => {
  try {
    const res = await calendar.calendarList.list();
    const calendars = res.data.items;
    if (calendars.length) {
      console.log("Available calendars:");
      calendars.map((cal) => {
        console.log(`${cal.id} - ${cal.summary}`);
      });
    } else {
      console.log("No calendars found.");
    }
  } catch (error) {
    console.error("❌ Error fetching calendars:", error.response?.data || error.message);
  }
};

// Function to List Calendar Events
const listEvents = async (calendarId) => {
  try {
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
      console.log("Upcoming 10 events:");
      events.map((event) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log("No upcoming events found.");
    }
  } catch (error) {
    console.error("❌ Error fetching events:", error.response?.data || error.message);
  }
};

// Test Listing Calendars and Events
const test = async () => {
  await listCalendars();
  await listEvents('bueno8485@gmail.com');
};

test();