import { SEARCH_QUERIES, LIMITS } from "../config/constants.js";

const BUILTIN_BASE = "https://www.builtinseattle.com";

function getLimitedQueries(category) {
  let queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();
  if (LIMITS.queriesPerCategory) {
    queries = queries.slice(0, LIMITS.queriesPerCategory);
  }
  return queries;
}

export async function scrapeBuiltIn(category = null) {
  const queries = getLimitedQueries(category);

  console.log(`BuiltIn: searching ${queries.length} queries`);

  const allJobs = [];

  for (const query of queries) {
    try {
      const searchUrl = `${BUILTIN_BASE}/jobs/search?search=${encodeURIComponent(query)}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      });

      if (!response.ok) {
        console.log(`BuiltIn returned ${response.status} for "${query}"`);
        continue;
      }

      const html = await response.text();
      const jobs = parseBuiltInHTML(html, category);
      allJobs.push(...jobs);

      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`BuiltIn scrape failed for query "${query}":`, error.message);
    }
  }

  return allJobs;
}

function parseBuiltInHTML(html, category) {
  const jobs = [];

  const jobPattern = /data-job-id="(\d+)".*?href="([^"]+)".*?class="[^"]*job-title[^"]*"[^>]*>([^<]+)/gs;

  let match;
  while ((match = jobPattern.exec(html)) !== null) {
    jobs.push({
      source: "builtin",
      externalId: match[1],
      url: match[2].startsWith("http") ? match[2] : `${BUILTIN_BASE}${match[2]}`,
      title: match[3].trim(),
      company: "Unknown",
      location: "Seattle, WA",
      salaryRange: null,
      postedAt: new Date(),
      description: null,
      companySize: null,
      roleCategory: category
    });
  }

  return jobs;
}

export default { scrapeBuiltIn };
