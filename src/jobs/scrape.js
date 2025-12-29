import "dotenv/config";
import { scrapeLinkedIn } from "../scrapers/linkedin.js";
import { scrapeIndeed } from "../scrapers/indeed.js";
import { scrapeGlassdoor } from "../scrapers/glassdoor.js";
import { scrapeUSAJobs } from "../scrapers/usajobs.js";
import { scrapeBuiltIn } from "../scrapers/builtin.js";
import { insertRawJob } from "../services/supabase.js";
import { LIMITS, SKIP_COMPANIES, SKIP_TITLE_KEYWORDS } from "../config/constants.js";

// Pre-filter jobs before storing
function shouldSkipJob(job) {
  // Skip blocked companies
  const companyLower = (job.company || "").toLowerCase();
  for (const blocked of SKIP_COMPANIES) {
    if (companyLower.includes(blocked.toLowerCase())) {
      return `company: ${blocked}`;
    }
  }

  // Skip blocked title keywords
  const titleLower = (job.title || "").toLowerCase();
  for (const keyword of SKIP_TITLE_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return `title contains: ${keyword}`;
    }
  }

  return null;
}

const ALL_SCRAPERS = [
  { name: "linkedin", label: "LinkedIn", fn: scrapeLinkedIn, frequency: "30min" },
  { name: "indeed", label: "Indeed", fn: scrapeIndeed, frequency: "30min" },
  { name: "glassdoor", label: "Glassdoor", fn: scrapeGlassdoor, frequency: "60min" },
  { name: "usajobs", label: "USAJobs", fn: scrapeUSAJobs, frequency: "60min" },
  { name: "builtin", label: "BuiltIn", fn: scrapeBuiltIn, frequency: "60min" }
];

export async function runAllScrapers() {
  console.log(`[${new Date().toISOString()}] Starting scrape run...`);

  // Filter scrapers based on LIMITS.enabledScrapers
  const SCRAPERS = LIMITS.enabledScrapers
    ? ALL_SCRAPERS.filter(s => LIMITS.enabledScrapers.includes(s.name))
    : ALL_SCRAPERS;

  if (LIMITS.enabledScrapers) {
    console.log(`Running limited scrapers: ${SCRAPERS.map(s => s.label).join(", ")}`);
  }

  const results = { total: 0, inserted: 0, duplicates: 0, filtered: 0, errors: [] };

  for (const scraper of SCRAPERS) {
    console.log(`Running ${scraper.label} scraper...`);

    try {
      const jobs = await scraper.fn();
      results.total += jobs.length;

      for (const job of jobs) {
        // Pre-filter before storing
        const skipReason = shouldSkipJob(job);
        if (skipReason) {
          console.log(`  Skipping "${job.title}" (${skipReason})`);
          results.filtered++;
          continue;
        }

        try {
          const inserted = await insertRawJob(job);
          if (inserted && inserted.length > 0) {
            results.inserted++;
          } else {
            results.duplicates++;
          }
        } catch (error) {
          if (error.code === "23505") {
            results.duplicates++;
          } else {
            console.error(`Insert error for ${job.title}:`, error.message);
            results.errors.push({ job: job.title, error: error.message });
          }
        }
      }

      console.log(`${scraper.label}: found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`${scraper.label} scraper failed:`, error.message);
      results.errors.push({ scraper: scraper.label, error: error.message });
    }
  }

  console.log(`
Scrape complete:
  - Total jobs found: ${results.total}
  - Pre-filtered out: ${results.filtered}
  - New jobs inserted: ${results.inserted}
  - Duplicates skipped: ${results.duplicates}
  - Errors: ${results.errors.length}
`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllScrapers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Scrape failed:", error);
      process.exit(1);
    });
}

export default { runAllScrapers };
