const { OpenAI } = require("openai");
const dotenv = require("dotenv");
const { getWhoopRecovery, getWhoopStrain } = require("./whoop_api");
const { getStravaRuns } = require("./strava_api");

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateTrainingPlan = async () => {
  const recoveryData = await getWhoopRecovery();
  const strainData = await getWhoopStrain();
  const recentRuns = await getStravaRuns();

  if (!recoveryData || !strainData || !recentRuns) {
    console.log("❌ Error: Missing WHOOP or Strava data.");
    return;
  }

    
  const latestStrain = strainData[0].score.strain;
  const latestRecovery = recoveryData[strainData.length - 1].score.recovery_score;
  const lastRun = recentRuns[1];
  const lastRunDistance = (lastRun.distance / 1000).toFixed(2);
  const lastRunPace = (lastRun.average_speed * 3.6).toFixed(2); // Convert m/s to km/h

  console.log(`WHOOP Recovery: ${JSON.stringify(latestRecovery)}%`);
  console.log(`WHOOP Strain: ${JSON.stringify(latestStrain)}`);
  console.log(`Last Run: ${lastRunDistance} km at ${lastRunPace} km/h`);

  const prompt = `
    Based on the following fitness data:
    - WHOOP Recovery Score: ${latestRecovery}%
    - Last Run: ${lastRunDistance} km at ${lastRunPace} km/h
    - The user is training for a half marathon.

    Provide a personalized training recommendation for today. Consider whether the user should do an easy run, rest, cross-train, or increase intensity. Keep it concise.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: "You are an AI coach providing endurance training advice." }, { role: "user", content: prompt }],
    temperature: 0.7,
  });

  console.log("🟢 AI Training Recommendation:");
  console.log(response.choices[0].message.content);
};

// Run AI-powered training analysis
generateTrainingPlan();
