import "dotenv/config";
import { getUnprocessedJobs, markJobProcessed, insertScoredJob } from "../services/supabase.js";
import { scoreJob, generateCoverLetter } from "../services/claude.js";
import { PRIORITY_THRESHOLDS } from "../config/constants.js";

export async function runScoring(batchSize = 20) {
  console.log(`[${new Date().toISOString()}] Starting scoring run...`);

  const jobs = await getUnprocessedJobs(batchSize);
  console.log(`Found ${jobs.length} unprocessed jobs`);

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

      if (scored.fitScore >= PRIORITY_THRESHOLDS.HIGH) {
        console.log(`Generating cover letter for high-priority job...`);
        scored.coverLetterDraft = await generateCoverLetter(job, scored);
        results.highPriority++;
      } else if (scored.fitScore >= PRIORITY_THRESHOLDS.MEDIUM) {
        results.mediumPriority++;
      } else {
        results.lowPriority++;
      }

      await insertScoredJob(scored);
      await markJobProcessed(job.id);

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
