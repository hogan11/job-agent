import "dotenv/config";
import { getUnnotifiedJobs, markJobNotified, getJobsForDigest } from "../services/supabase.js";
import { sendHighPriorityAlert, sendToAllJobsChannel } from "../services/discord.js";
import { sendDigestEmail } from "../services/email.js";
import { PRIORITY_THRESHOLDS } from "../config/constants.js";

export async function sendNotifications() {
  console.log(`[${new Date().toISOString()}] Starting notification run...`);

  const jobs = await getUnnotifiedJobs(PRIORITY_THRESHOLDS.MEDIUM);
  console.log(`Found ${jobs.length} unnotified jobs`);

  const results = { notified: 0, highPriority: 0, errors: [] };

  for (const scoredJob of jobs) {
    const rawJob = scoredJob.raw_jobs;

    try {
      await sendToAllJobsChannel(scoredJob, rawJob);

      if (scoredJob.fit_score >= PRIORITY_THRESHOLDS.HIGH) {
        await sendHighPriorityAlert(scoredJob, rawJob);
        results.highPriority++;
      }

      await markJobNotified(scoredJob.id);
      results.notified++;

      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`Notification error for ${rawJob?.title}:`, error.message);
      results.errors.push({ job: rawJob?.title, error: error.message });
    }
  }

  console.log(`
Notifications complete:
  - Total notified: ${results.notified}
  - High priority alerts: ${results.highPriority}
  - Errors: ${results.errors.length}
`);

  return results;
}

export async function sendDailyDigest() {
  console.log(`[${new Date().toISOString()}] Sending daily digest...`);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const jobs = await getJobsForDigest(since);
  await sendDigestEmail(jobs, "Daily");
  console.log(`Daily digest sent with ${jobs.length} jobs`);
}

export async function sendEveningDigest() {
  console.log(`[${new Date().toISOString()}] Sending evening digest...`);
  const since = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const jobs = await getJobsForDigest(since);
  await sendDigestEmail(jobs, "Afternoon");
  console.log(`Evening digest sent with ${jobs.length} jobs`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "notify";
  const commands = { notify: sendNotifications, daily: sendDailyDigest, evening: sendEveningDigest };
  const fn = commands[command];
  if (!fn) {
    console.error(`Unknown command: ${command}`);
    console.log(`Available: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }
  fn().then(() => process.exit(0)).catch(error => { console.error("Notify failed:", error); process.exit(1); });
}

export default { sendNotifications, sendDailyDigest, sendEveningDigest };
