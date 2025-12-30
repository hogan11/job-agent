import "dotenv/config";
import { getJobsByStatus, updateJob, getAllJobs } from "../services/sheets.js";
import { sendHighPriorityAlert, sendToAllJobsChannel } from "../services/discord.js";
import { sendDigestEmail } from "../services/email.js";
import { PRIORITY_THRESHOLDS, FRESHNESS_LABELS } from "../config/constants.js";

export async function sendNotifications() {
  console.log(`[${new Date().toISOString()}] Starting notification run...`);

  // Get scored jobs that haven't been notified
  const scoredJobs = await getJobsByStatus("Scored");
  console.log(`Found ${scoredJobs.length} scored jobs to notify`);

  const results = { notified: 0, highPriority: 0, errors: [] };

  for (const job of scoredJobs) {
    try {
      // Format for Discord - include freshness
      const scoredJob = {
        fit_score: job.score,
        priority_tier: job.priority,
        freshness: job.freshness,
        ai_reasoning: job.aiReasoning,
        cover_letter_draft: job.coverLetter
      };
      const rawJob = {
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url
      };

      await sendToAllJobsChannel(scoredJob, rawJob);

      // High-priority alert: Score >= threshold AND job is Hot (fresh)
      const isHot = job.freshness === FRESHNESS_LABELS.HOT;
      const isHighScore = job.score >= PRIORITY_THRESHOLDS.HIGH;

      if (isHighScore && isHot) {
        await sendHighPriorityAlert(scoredJob, rawJob);
        results.highPriority++;
        console.log(`  🔥 HIGH PRIORITY: ${job.title} (Score: ${job.score}, ${job.freshness})`);
      } else if (isHighScore) {
        console.log(`  ⏳ High score but not hot: ${job.title} (Score: ${job.score}, ${job.freshness})`);
      }

      await updateJob(job.id, { status: "Notified" });
      results.notified++;

      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`Notification error for ${job.title}:`, error.message);
      results.errors.push({ job: job.title, error: error.message });
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
  const allJobs = await getAllJobs();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentJobs = allJobs.filter(j => new Date(j.scrapedAt) > since && j.score);
  await sendDigestEmail(recentJobs, "Daily");
  console.log(`Daily digest sent with ${recentJobs.length} jobs`);
}

export async function sendEveningDigest() {
  console.log(`[${new Date().toISOString()}] Sending evening digest...`);
  const allJobs = await getAllJobs();
  const since = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const recentJobs = allJobs.filter(j => new Date(j.scrapedAt) > since && j.score);
  await sendDigestEmail(recentJobs, "Afternoon");
  console.log(`Evening digest sent with ${recentJobs.length} jobs`);
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
