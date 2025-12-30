import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, "../../google-credentials.json");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Column headers for the jobs sheet
const HEADERS = [
  "ID",
  "Title",
  "Company",
  "Location",
  "URL",
  "Score",
  "Priority",
  "Scraped At",
  "Status",
  "Approved",
  "Notes",
  "AI Reasoning",
  "Key Requirements",
  "Cover Letter",
  "Custom Resume Link"
];

let sheetsClient = null;

async function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function initializeSheet() {
  const sheets = await getClient();

  // Check if headers exist
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "A1:O1"
  });

  if (!response.data.values || response.data.values.length === 0) {
    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "A1:O1",
      valueInputOption: "RAW",
      requestBody: {
        values: [HEADERS]
      }
    });
    console.log("Sheet initialized with headers");
  }

  return true;
}

export async function appendJob(job) {
  const sheets = await getClient();

  const row = [
    job.id || crypto.randomUUID(),
    job.title,
    job.company,
    job.location,
    job.url,
    job.score || "",
    job.priority || "",
    new Date().toISOString(),
    "New",           // Status
    "FALSE",         // Approved checkbox
    "",              // Notes
    job.aiReasoning || "",
    job.keyRequirements?.join(", ") || "",
    job.coverLetter || "",
    ""               // Custom Resume Link
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "A:O",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row]
    }
  });

  return row[0]; // Return the ID
}

export async function getAllJobs() {
  const sheets = await getClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "A2:O" // Skip header row
  });

  const rows = response.data.values || [];

  return rows.map(row => ({
    id: row[0],
    title: row[1],
    company: row[2],
    location: row[3],
    url: row[4],
    score: row[5] ? parseInt(row[5]) : null,
    priority: row[6],
    scrapedAt: row[7],
    status: row[8],
    approved: row[9] === "TRUE",
    notes: row[10],
    aiReasoning: row[11],
    keyRequirements: row[12],
    coverLetter: row[13],
    customResumeLink: row[14]
  }));
}

export async function getJobsByStatus(status) {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.status === status);
}

export async function getApprovedJobs() {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.approved && !job.coverLetter);
}

export async function getUnscoredJobs() {
  const jobs = await getAllJobs();
  return jobs.filter(job => !job.score);
}

export async function updateJob(jobId, updates) {
  const sheets = await getClient();
  const jobs = await getAllJobs();

  const rowIndex = jobs.findIndex(j => j.id === jobId);
  if (rowIndex === -1) {
    throw new Error(`Job ${jobId} not found`);
  }

  const actualRow = rowIndex + 2; // +1 for header, +1 for 0-index

  // Build update ranges based on what's being updated
  const updateRanges = [];

  if (updates.score !== undefined) {
    updateRanges.push({
      range: `F${actualRow}`,
      values: [[updates.score]]
    });
  }
  if (updates.priority !== undefined) {
    updateRanges.push({
      range: `G${actualRow}`,
      values: [[updates.priority]]
    });
  }
  if (updates.status !== undefined) {
    updateRanges.push({
      range: `I${actualRow}`,
      values: [[updates.status]]
    });
  }
  if (updates.aiReasoning !== undefined) {
    updateRanges.push({
      range: `L${actualRow}`,
      values: [[updates.aiReasoning]]
    });
  }
  if (updates.keyRequirements !== undefined) {
    updateRanges.push({
      range: `M${actualRow}`,
      values: [[updates.keyRequirements.join(", ")]]
    });
  }
  if (updates.coverLetter !== undefined) {
    updateRanges.push({
      range: `N${actualRow}`,
      values: [[updates.coverLetter]]
    });
  }
  if (updates.customResumeLink !== undefined) {
    updateRanges.push({
      range: `O${actualRow}`,
      values: [[updates.customResumeLink]]
    });
  }

  for (const update of updateRanges) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: update.range,
      valueInputOption: "RAW",
      requestBody: {
        values: update.values
      }
    });
  }

  return true;
}

export async function jobExists(url) {
  const jobs = await getAllJobs();
  return jobs.some(j => j.url === url);
}

export default {
  initializeSheet,
  appendJob,
  getAllJobs,
  getJobsByStatus,
  getApprovedJobs,
  getUnscoredJobs,
  updateJob,
  jobExists
};
