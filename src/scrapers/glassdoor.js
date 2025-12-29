import { runActor } from "../services/apify.js";
import { APIFY_ACTORS, SEARCH_QUERIES, LOCATION } from "../config/constants.js";

export async function scrapeGlassdoor(category = null) {
  const queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();

  const allJobs = [];

  for (const query of queries) {
    try {
      const items = await runActor(APIFY_ACTORS.glassdoor, {
        keyword: query,
        location: LOCATION,
        maxItems: 20,
        includeJobDescription: true
      });

      const normalizedJobs = items.map(item => normalizeGlassdoorJob(item, category));
      allJobs.push(...normalizedJobs);

      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`Glassdoor scrape failed for query "${query}":`, error.message);
    }
  }

  return allJobs;
}

function normalizeGlassdoorJob(item, category) {
  return {
    source: "glassdoor",
    externalId: item.id || item.jobId,
    url: item.url || item.jobLink,
    title: item.jobTitle || item.title,
    company: item.employer || item.companyName,
    location: item.location,
    salaryRange: formatGlassdoorSalary(item),
    postedAt: item.postedDate ? new Date(item.postedDate) : new Date(),
    description: item.description || item.jobDescription,
    companySize: item.companySize || null,
    roleCategory: category
  };
}

function formatGlassdoorSalary(item) {
  if (item.salaryRange) return item.salaryRange;
  if (item.minSalary && item.maxSalary) {
    return `$${item.minSalary.toLocaleString()} - $${item.maxSalary.toLocaleString()}`;
  }
  return null;
}

export default { scrapeGlassdoor };
