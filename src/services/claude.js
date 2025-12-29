import Anthropic from "@anthropic-ai/sdk";
import { CANDIDATE_PROFILE, SCORING_INSTRUCTIONS } from "../config/profile.js";
import { PRIORITY_THRESHOLDS, DEPRIORITIZE_COMPANIES, SKIP_TITLE_KEYWORDS } from "../config/constants.js";

const anthropic = new Anthropic();

export async function scoreJob(job) {
  const prompt = buildScoringPrompt(job);

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    return parseScoreResponse(content, job);
  } catch (error) {
    console.error(`Claude scoring failed for job ${job.id}:`, error.message);
    return null;
  }
}

function buildScoringPrompt(job) {
  const isDeprioritizedCompany = DEPRIORITIZE_COMPANIES.some(
    company => job.company?.toLowerCase().includes(company.toLowerCase())
  );

  // Check if title contains deprioritized keywords
  const titleLower = (job.title || "").toLowerCase();
  const deprioritizedKeywords = SKIP_TITLE_KEYWORDS.filter(
    keyword => titleLower.includes(keyword.toLowerCase())
  );
  const hasDeprioritizedRole = deprioritizedKeywords.length > 0;

  let deprioritizationNotes = "";
  if (isDeprioritizedCompany) {
    deprioritizationNotes += "NOTE: This company (Amazon/AWS) should be heavily deprioritized (-30 pts).\n";
  }
  if (hasDeprioritizedRole) {
    deprioritizationNotes += `NOTE: This role contains keywords (${deprioritizedKeywords.join(", ")}) that are NOT a good fit. Score should be MEDIUM at most (under 80).\n`;
  }

  return `${CANDIDATE_PROFILE}

${SCORING_INSTRUCTIONS}

${deprioritizationNotes}

JOB TO SCORE:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary_range || "Not specified"}
Description: ${job.description?.slice(0, 3000) || "No description available"}

Respond in this exact JSON format:
{
  "fit_score": <number 1-100>,
  "ghost_job_likelihood": <number 1-100>,
  "role_category": "<strategic|program|procurement|techLeadership|other>",
  "reasoning": "<2-3 sentences explaining the score>",
  "key_requirements": ["<requirement 1>", "<requirement 2>", "<requirement 3>"]
}`;
}

function parseScoreResponse(content, job) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    let priorityTier = "low";
    if (parsed.fit_score >= PRIORITY_THRESHOLDS.HIGH) {
      priorityTier = "high";
    } else if (parsed.fit_score >= PRIORITY_THRESHOLDS.MEDIUM) {
      priorityTier = "medium";
    }

    return {
      rawJobId: job.id,
      fitScore: parsed.fit_score,
      ghostJobLikelihood: parsed.ghost_job_likelihood,
      roleCategory: parsed.role_category,
      priorityTier,
      aiReasoning: parsed.reasoning,
      keyRequirements: parsed.key_requirements,
      coverLetterDraft: null
    };
  } catch (error) {
    console.error("Failed to parse Claude response:", error.message);
    return null;
  }
}

export async function generateCoverLetter(job, scoredJob) {
  const prompt = `${CANDIDATE_PROFILE}

Write a compelling 3-paragraph cover letter for this job opportunity.

JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description?.slice(0, 2000)}

KEY REQUIREMENTS IDENTIFIED:
${scoredJob.keyRequirements?.join("\n- ") || "Not specified"}

INSTRUCTIONS:
1. First paragraph: Hook - why this specific role at this specific company excites you
2. Second paragraph: Value - 2-3 specific examples from background that match their needs
3. Third paragraph: Close - enthusiasm and call to action

Keep it concise (under 300 words). Be specific, not generic.
Do not include placeholder text like [Company Name] - use the actual company name.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error(`Cover letter generation failed:`, error.message);
    return null;
  }
}

export default { scoreJob, generateCoverLetter };
