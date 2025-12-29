import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigestEmail(jobs, periodLabel = "Daily") {
  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!toEmail) {
    console.warn("NOTIFICATION_EMAIL not configured");
    return;
  }

  const highPriority = jobs.filter(j => j.priority_tier === "high");
  const mediumPriority = jobs.filter(j => j.priority_tier === "medium");

  const html = buildDigestHTML(highPriority, mediumPriority, periodLabel);

  try {
    await resend.emails.send({
      from: "Job Hunter <jobs@updates.yourdomain.com>",
      to: toEmail,
      subject: `${periodLabel} Job Digest: ${highPriority.length} high priority, ${mediumPriority.length} medium`,
      html
    });
    console.log(`Digest email sent to ${toEmail}`);
  } catch (error) {
    console.error("Email send failed:", error.message);
  }
}

function buildDigestHTML(highPriority, mediumPriority, periodLabel) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #e74c3c; margin-top: 30px; }
    h3 { color: #27ae60; margin-top: 30px; }
    .job-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
    .job-card.high { border-left-color: #e74c3c; }
    .job-title { font-size: 18px; font-weight: bold; color: #2c3e50; text-decoration: none; }
    .job-title:hover { text-decoration: underline; }
    .job-company { color: #7f8c8d; margin: 5px 0; }
    .job-meta { font-size: 14px; color: #95a5a6; }
    .score { display: inline-block; background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    .score.high { background: #e74c3c; }
    .stats { background: #ecf0f1; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📊 ${periodLabel} Job Digest</h1>
  <div class="stats">
    <strong>Summary:</strong> ${highPriority.length} high priority, ${mediumPriority.length} medium priority jobs found
  </div>
  ${highPriority.length > 0 ? `
  <h2>🔥 High Priority (Score 80+)</h2>
  ${highPriority.map(job => renderJobCard(job, true)).join("")}
  ` : ""}
  ${mediumPriority.length > 0 ? `
  <h3>📋 Medium Priority (Score 50-79)</h3>
  ${mediumPriority.map(job => renderJobCard(job, false)).join("")}
  ` : ""}
  ${highPriority.length === 0 && mediumPriority.length === 0 ? `
  <p>No new matching jobs found in this period. The search continues!</p>
  ` : ""}
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #ecf0f1;">
  <p style="font-size: 12px; color: #95a5a6;">Job Hunter Agent • Automated job search for Albert Hogan</p>
</body>
</html>`;
}

function renderJobCard(scoredJob, isHigh) {
  const job = scoredJob.raw_jobs;
  return `
  <div class="job-card ${isHigh ? "high" : ""}">
    <a href="${job.url}" class="job-title">${job.title}</a>
    <div class="job-company">${job.company} • ${job.location || "Location N/A"}</div>
    <div class="job-meta">
      <span class="score ${isHigh ? "high" : ""}">${scoredJob.fit_score}</span>
      ${job.salary_range ? ` • ${job.salary_range}` : ""}
      • ${formatCategory(scoredJob.role_category)}
    </div>
    <p style="margin-top: 10px; font-size: 14px;">${scoredJob.ai_reasoning || ""}</p>
  </div>`;
}

function formatCategory(category) {
  const labels = {
    strategic: "Strategic/Leadership",
    program: "Program Management",
    procurement: "Procurement/Sourcing",
    techLeadership: "Technology Leadership",
    other: "Other"
  };
  return labels[category] || category;
}

export default { sendDigestEmail };
