import "dotenv/config";
import cron from "node-cron";
import { runAllScrapers } from "./jobs/scrape.js";
import { runScoring } from "./jobs/score.js";
import { processApprovedJobs } from "./jobs/generate.js";
import { sendNotifications, sendDailyDigest, sendEveningDigest } from "./jobs/notify.js";
import { refreshFreshness } from "./services/sheets.js";

console.log("Job Hunter Agent starting...");
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

const requiredEnvVars = ["GOOGLE_SHEET_ID", "ANTHROPIC_API_KEY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function runPipeline() {
  console.log("\n" + "=".repeat(50));
  console.log(`Pipeline started at ${new Date().toISOString()}`);
  console.log("=".repeat(50));

  try {
    // Update freshness tiers based on job age (Hot → New → Standard)
    await refreshFreshness();

    await runAllScrapers();
    await runScoring();
    await processApprovedJobs(); // Generate cover letters for approved jobs
    await sendNotifications();
    console.log("Pipeline completed successfully");
  } catch (error) {
    console.error("Pipeline error:", error);
  }
}

cron.schedule("0,30 6-20 * * 1-5", () => {
  console.log("⏰ Scheduled run: Weekday pipeline");
  runPipeline();
}, { timezone: "America/Los_Angeles" });

cron.schedule("0 8,12,18 * * 0,6", () => {
  console.log("⏰ Scheduled run: Weekend pipeline");
  runPipeline();
}, { timezone: "America/Los_Angeles" });

cron.schedule("0 8 * * *", () => {
  console.log("📧 Sending daily digest");
  sendDailyDigest();
}, { timezone: "America/Los_Angeles" });

cron.schedule("0 17 * * 1-5", () => {
  console.log("📧 Sending evening digest");
  sendEveningDigest();
}, { timezone: "America/Los_Angeles" });

if (process.argv.includes("--run-now")) {
  console.log("Running pipeline immediately (--run-now flag)");
  runPipeline();
}

console.log(`
📅 Scheduled jobs:
  - Weekday pipeline: Every 30 min, 6am-8pm PT (Mon-Fri)
  - Weekend pipeline: 8am, 12pm, 6pm PT (Sat-Sun)
  - Daily digest: 8am PT
  - Evening digest: 5pm PT (Mon-Fri)

Use --run-now flag to run immediately on startup.
`);

process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});
