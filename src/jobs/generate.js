import "dotenv/config";
import { getApprovedJobs, updateJob } from "../services/sheets.js";
import { generateCoverLetter } from "../services/claude.js";
import { generateCustomResume } from "../services/resume.js";

/**
 * Process approved jobs - generate cover letters and customized resumes
 *
 * Workflow:
 * 1. You review jobs in Google Sheets
 * 2. Set "Approved" column to TRUE for jobs you want to apply to
 * 3. Run this script to generate cover letters AND customized resumes
 * 4. Cover letters appear in the "Cover Letter" column
 * 5. Resume links appear in the "Custom Resume Link" column
 */
export async function processApprovedJobs() {
  console.log(`[${new Date().toISOString()}] Processing approved jobs...`);

  const approvedJobs = await getApprovedJobs();
  console.log(`Found ${approvedJobs.length} approved jobs needing materials`);

  if (approvedJobs.length === 0) {
    console.log("No approved jobs to process. Mark jobs as 'Approved' in the Google Sheet.");
    return { processed: 0 };
  }

  const results = { processed: 0, resumes: 0, coverLetters: 0, errors: [] };

  for (const job of approvedJobs) {
    try {
      console.log(`\nProcessing: ${job.title} at ${job.company}`);

      // Build job object for generation
      const jobData = {
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        aiReasoning: job.aiReasoning,
        keyRequirements: job.keyRequirements
      };

      const scoredData = {
        keyRequirements: job.keyRequirements?.split(", ") || []
      };

      // Generate customized resume
      console.log("  Creating customized resume...");
      const resumeUrl = await generateCustomResume(jobData);
      results.resumes++;

      // Generate cover letter
      console.log("  Creating cover letter...");
      const coverLetter = await generateCoverLetter(
        { ...jobData, description: job.aiReasoning },
        scoredData
      );
      results.coverLetters++;

      // Update the sheet with both
      await updateJob(job.id, {
        coverLetter: coverLetter,
        customResumeLink: resumeUrl,
        status: "Ready to Apply"
      });

      console.log(`  Done! Resume: ${resumeUrl}`);
      results.processed++;

      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.error(`Error processing ${job.title}:`, error.message);
      results.errors.push({ job: job.title, error: error.message });
    }
  }

  console.log(`
Generation complete:
  - Jobs processed: ${results.processed}
  - Resumes created: ${results.resumes}
  - Cover letters created: ${results.coverLetters}
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
