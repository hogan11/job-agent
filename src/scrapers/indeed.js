import { runActor } from "../services/apify.js";
import { APIFY_ACTORS, SEARCH_QUERIES, LOCATION } from "../config/constants.js";

export async function scrapeIndeed(category = null) {
  const queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();

  const allJobs = [];

  for (const query of queries) {
    try {
      const items = await runActor(APIFY_ACTORS.indeed, {
        position: query,
        location: LOCATION,
        maxItems: 25,
        parseCompanyDetails: true,
        sortBy: "date"
      });

      const normalizedJobs = items.map(item => normalizeIndeedJob(item, category));
      allJobs.push(...normalizedJobs);

      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`Indeed scrape failed for query "${query}":`, error.message);
    }
  }

  return allJobs;
}

function normalizeIndeedJob(item, category) {
  return {
    source: "indeed",
    externalId: item.id || item.jobKey,
    url: item.url || item.link,
    title: item.title || item.positionName,
    company: item.company || item.companyName,
    location: item.location,
    salaryRange: item.salary || item.salaryText || null,
    postedAt: item.postedAt ? new Date(item.postedAt) : new Date(),
    description: item.description,
    companySize: null,
    roleCategory: category
  };
}

export default { scrapeIndeed };
