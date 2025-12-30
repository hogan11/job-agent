import "dotenv/config";
import { getUnscoredJobs, updateJob } from "../services/sheets.js";
import { scoreJob, generateCoverLetter } from "../services/claude.js";
import { PRIORITY_THRESHOLDS, COVER_LETTER_THRESHOLD } from "../config/constants.js";

export async function runScoring(batchSize = 20) {
  console.log(`[${new Date().toISOString()}] Starting scoring run...`);

  const allJobs = await getUnscoredJobs();
  const jobs = allJobs.slice(0, batchSize);
  console.log(`Found ${jobs.length} unscored jobs`);

  const results = { processed: 0, highPriority: 0, mediumPriority: 0, lowPriority: 0, errors: [] };

  for (const job of jobs) {
    try {
      console.log(`Scoring: ${job.title} at ${job.company}`);

      const scored = await scoreJob(job);

      if (!scored) {
        console.warn(`Scoring returned null for job ${job.id}`);
        results.errors.push({ job: job.title, error: "Scoring returned null" });
        continue;
      }

      let priority = "low";
      if (scored.fitScore >= PRIORITY_THRESHOLDS.HIGH) {
        priority = "high";
        results.highPriority++;
      } else if (scored.fitScore >= PRIORITY_THRESHOLDS.MEDIUM) {
        priority = "medium";
        results.mediumPriority++;
      } else {
        results.lowPriority++;
      }

      // Update the job in Google Sheets
      await updateJob(job.id, {
        score: scored.fitScore,
        priority: priority,
        status: "Scored",
        aiReasoning: scored.aiReasoning,
        keyRequirements: scored.keyRequirements
      });

      results.processed++;

      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.error(`Scoring error for ${job.title}:`, error.message);
      results.errors.push({ job: job.title, error: error.message });
    }
  }

  console.log(`
Scoring complete:
  - Processed: ${results.processed}
  - High priority: ${results.highPriority}
  - Medium priority: ${results.mediumPriority}
  - Low priority: ${results.lowPriority}
  - Errors: ${results.errors.length}
`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runScoring()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Scoring failed:", error);
      process.exit(1);
    });
}

export default { runScoring };
