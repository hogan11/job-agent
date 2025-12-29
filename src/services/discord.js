export async function sendHighPriorityAlert(scoredJob, rawJob) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_HIGH_PRIORITY;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_HIGH_PRIORITY not configured");
    return;
  }

  const embed = {
    title: `${rawJob.title}`,
    url: rawJob.url,
    color: 0xff6b6b,
    fields: [
      { name: "Company", value: rawJob.company || "Unknown", inline: true },
      { name: "Location", value: rawJob.location || "Not specified", inline: true },
      { name: "Fit Score", value: `${scoredJob.fit_score}/100`, inline: true },
      { name: "Salary", value: rawJob.salary_range || "Not specified", inline: true },
      { name: "Category", value: formatCategory(scoredJob.role_category), inline: true },
      { name: "Ghost Risk", value: `${scoredJob.ghost_job_likelihood}%`, inline: true },
      { name: "Why This Fits", value: scoredJob.ai_reasoning?.slice(0, 1000) || "No analysis available" },
      { name: "Key Requirements", value: scoredJob.key_requirements?.slice(0, 5).map(r => `• ${r}`).join("\n") || "Not specified" }
    ],
    footer: { text: `Source: ${rawJob.source} | Posted: ${formatTimeAgo(rawJob.posted_at)}` },
    timestamp: new Date().toISOString()
  };

  await sendWebhook(webhookUrl, {
    content: `🔥 **HIGH MATCH (Score: ${scoredJob.fit_score})**`,
    embeds: [embed]
  });
}

export async function sendToAllJobsChannel(scoredJob, rawJob) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ALL_JOBS;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_ALL_JOBS not configured");
    return;
  }

  const priorityEmoji = scoredJob.priority_tier === "high" ? "🔥" : "📋";
  const color = scoredJob.priority_tier === "high" ? 0xff6b6b : 0x4ecdc4;

  const embed = {
    title: rawJob.title,
    url: rawJob.url,
    color,
    description: `**${rawJob.company}** • ${rawJob.location || "Location N/A"}`,
    fields: [
      { name: "Score", value: `${scoredJob.fit_score}/100`, inline: true },
      { name: "Category", value: formatCategory(scoredJob.role_category), inline: true },
      { name: "Salary", value: rawJob.salary_range || "N/A", inline: true }
    ],
    footer: { text: `${rawJob.source} | ${formatTimeAgo(rawJob.posted_at)}` }
  };

  await sendWebhook(webhookUrl, {
    content: `${priorityEmoji} New ${scoredJob.priority_tier} priority job`,
    embeds: [embed]
  });
}

async function sendWebhook(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Discord webhook error:", error.message);
  }
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

function formatTimeAgo(date) {
  if (!date) return "Unknown";
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now - posted;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default { sendHighPriorityAlert, sendToAllJobsChannel };
