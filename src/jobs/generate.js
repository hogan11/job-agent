import "dotenv/config";
import { getApprovedJobs, updateJob } from "../services/sheets.js";
import { generateCoverLetter } from "../services/claude.js";

/**
 * Process approved jobs - generate cover letters and customized resumes
 *
 * Workflow:
 * 1. You review jobs in Google Sheets
 * 2. Set "Approved" column to TRUE for jobs you want to apply to
 * 3. Run this script to generate cover letters
 * 4. Cover letters appear in the "Cover Letter" column
 */
export async function processApprovedJobs() {
  console.log(`[${new Date().toISOString()}] Processing approved jobs...`);

  const approvedJobs = await getApprovedJobs();
  console.log(`Found ${approvedJobs.length} approved jobs needing cover letters`);

  if (approvedJobs.length === 0) {
    console.log("No approved jobs to process. Mark jobs as 'Approved' in the Google Sheet.");
    return { processed: 0 };
  }

  const results = { processed: 0, errors: [] };

  for (const job of approvedJobs) {
    try {
      console.log(`Generating cover letter for: ${job.title} at ${job.company}`);

      // Build job object for cover letter generation
      const jobData = {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.aiReasoning // Use AI reasoning as context
      };

      const scoredData = {
        keyRequirements: job.keyRequirements?.split(", ") || []
      };

      const coverLetter = await generateCoverLetter(jobData, scoredData);

      if (coverLetter) {
        await updateJob(job.id, {
          coverLetter: coverLetter,
          status: "Ready to Apply"
        });
        console.log(`  Cover letter generated!`);
        results.processed++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`Error processing ${job.title}:`, error.message);
      results.errors.push({ job: job.title, error: error.message });
    }
  }

  console.log(`
Generation complete:
  - Cover letters generated: ${results.processed}
  - Errors: ${results.errors.length}
`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  processApprovedJobs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Generation failed:", error);
      process.exit(1);
    });
}

export default { processApprovedJobs };
