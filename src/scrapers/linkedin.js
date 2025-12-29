import { runActor } from "../services/apify.js";
import { APIFY_ACTORS, SEARCH_QUERIES, LOCATION } from "../config/constants.js";

export async function scrapeLinkedIn(category = null) {
  const queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();

  const allJobs = [];

  for (const query of queries) {
    try {
      const items = await runActor(APIFY_ACTORS.linkedin, {
        searchQueries: [query],
        location: LOCATION,
        maxItems: 25,
        scrapeJobDetails: true,
        datePosted: "past24hours"
      });

      const normalizedJobs = items.map(item => normalizeLinkedInJob(item, category));
      allJobs.push(...normalizedJobs);

      // Rate limiting between queries
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`LinkedIn scrape failed for query "${query}":`, error.message);
    }
  }

  return allJobs;
}

function normalizeLinkedInJob(item, category) {
  return {
    source: "linkedin",
    externalId: item.id || item.jobId,
    url: item.link || item.url,
    title: item.title,
    company: item.company || item.companyName,
    location: item.location,
    salaryRange: item.salary || null,
    postedAt: parseLinkedInDate(item.postedAt || item.publishedAt),
    description: item.description || item.descriptionText,
    companySize: item.companySize || null,
    roleCategory: category
  };
}

function parseLinkedInDate(dateStr) {
  if (!dateStr) return new Date();

  // Handle "2 hours ago", "1 day ago" format
  const match = dateStr.match(/(\d+)\s+(hour|day|week|month)s?\s+ago/i);
  if (match) {
    const [, num, unit] = match;
    const now = new Date();
    const multipliers = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    return new Date(now - parseInt(num) * multipliers[unit.toLowerCase()]);
  }

  return new Date(dateStr);
}

export default { scrapeLinkedIn };
