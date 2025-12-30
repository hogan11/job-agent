import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_RESUME_PATH = path.join(__dirname, "../config/base-resume.md");
const RESUMES_DIR = path.join(__dirname, "../../resumes");

const anthropic = new Anthropic();

function getBaseResume() {
  return fs.readFileSync(BASE_RESUME_PATH, "utf-8");
}

/**
 * Use Claude to customize the resume based on job requirements
 */
export async function customizeResume(job) {
  const baseResume = getBaseResume();

  const prompt = `You are an expert resume writer helping customize a resume for a specific job application.

## BASE RESUME (in Markdown):
${baseResume}

## TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}

## JOB REQUIREMENTS/CONTEXT:
${job.aiReasoning || "No specific requirements provided"}

Key Requirements: ${job.keyRequirements || "Not specified"}

## YOUR TASK:
Customize this resume for the target job using MODERATE keyword injection:

1. **SUMMARY**: Rewrite the summary paragraph to emphasize skills and experience most relevant to this specific role. Include 2-3 keywords from the job naturally.

2. **CORE COMPETENCIES**: Reorder the competencies table to put the most relevant skills first. You may swap 1-2 items if there are more relevant terms that apply to this candidate's experience.

3. **EXPERIENCE BULLETS**: For each job, reorder bullets to put the most relevant achievements first. Reword bullets to naturally incorporate job-relevant terminology WITHOUT changing the facts or accomplishments.

4. **Keep intact**: Contact info, education, dates, company names, job titles, and the Leadership Impact section.

## RULES:
- Do NOT invent new experience or achievements
- Do NOT change job titles, company names, or dates
- DO reword existing bullets to use terminology from the job posting
- DO reorder content to emphasize relevance
- Keep the same Markdown structure
- Output ONLY the customized resume in Markdown format, no commentary

## OUTPUT:
Return the complete customized resume in Markdown format:`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Resume customization failed:", error.message);
    throw error;
  }
}

/**
 * Save customized resume as a local markdown file
 * (Google Drive service accounts have quota limitations)
 */
export async function createResumeDoc(customizedMarkdown, job) {
  // Create filename from job details
  const sanitizedCompany = (job.company || "Unknown").replace(/[^a-zA-Z0-9]/g, "-");
  const sanitizedTitle = (job.title || "Position").replace(/[^a-zA-Z0-9]/g, "-");
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${timestamp}-${sanitizedCompany}-${sanitizedTitle}.md`;
  const filepath = path.join(RESUMES_DIR, filename);

  // Ensure resumes directory exists
  if (!fs.existsSync(RESUMES_DIR)) {
    fs.mkdirSync(RESUMES_DIR, { recursive: true });
  }

  // Save the markdown file
  fs.writeFileSync(filepath, customizedMarkdown, "utf-8");

  console.log(`  Saved resume to: ${filepath}`);
  return filepath;
}

/**
 * Full pipeline: customize resume and save locally
 */
export async function generateCustomResume(job) {
  console.log(`Customizing resume for: ${job.title} at ${job.company}`);

  // Step 1: Customize with Claude
  const customizedMarkdown = await customizeResume(job);

  // Step 2: Save to local file
  const filepath = await createResumeDoc(customizedMarkdown, job);

  return filepath;
}

export default {
  customizeResume,
  createResumeDoc,
  generateCustomResume
};
