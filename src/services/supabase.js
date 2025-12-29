import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export function generateJobHash(job) {
  const hashInput = `${job.url}|${job.title}|${job.company}`.toLowerCase();
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

export async function insertRawJob(job) {
  const jobHash = generateJobHash(job);

  const { data, error } = await supabase
    .from("raw_jobs")
    .upsert(
      {
        source: job.source,
        external_id: job.externalId,
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location,
        salary_range: job.salaryRange,
        posted_at: job.postedAt,
        description: job.description,
        company_size: job.companySize,
        job_hash: jobHash,
        processed: false
      },
      { onConflict: "job_hash", ignoreDuplicates: true }
    )
    .select();

  if (error) throw error;
  return data;
}

export async function getUnprocessedJobs(limit = 50) {
  const { data, error } = await supabase
    .from("raw_jobs")
    .select("*")
    .eq("processed", false)
    .order("scraped_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function markJobProcessed(jobId) {
  const { error } = await supabase
    .from("raw_jobs")
    .update({ processed: true })
    .eq("id", jobId);

  if (error) throw error;
}

export async function insertScoredJob(scoredJob) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .insert({
      raw_job_id: scoredJob.rawJobId,
      fit_score: scoredJob.fitScore,
      ghost_job_likelihood: scoredJob.ghostJobLikelihood,
      role_category: scoredJob.roleCategory,
      priority_tier: scoredJob.priorityTier,
      ai_reasoning: scoredJob.aiReasoning,
      cover_letter_draft: scoredJob.coverLetterDraft,
      key_requirements: scoredJob.keyRequirements,
      notified: false
    })
    .select();

  if (error) throw error;
  return data[0];
}

export async function getUnnotifiedJobs(minScore = 50) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .select(`
      *,
      raw_jobs (*)
    `)
    .eq("notified", false)
    .gte("fit_score", minScore)
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markJobNotified(scoredJobId) {
  const { error } = await supabase
    .from("scored_jobs")
    .update({ notified: true })
    .eq("id", scoredJobId);

  if (error) throw error;
}

export async function getJobsForDigest(since) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .select(`
      *,
      raw_jobs (*)
    `)
    .gte("scored_at", since.toISOString())
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export default supabase;
