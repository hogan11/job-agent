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

  // Extract JSON-LD structured data (more reliable than HTML parsing)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) {
    console.log("BuiltIn: No JSON-LD data found");
    return jobs;
  }

  try {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const graph = jsonLd["@graph"] || [jsonLd];

    // Find the ItemList containing job listings
    const itemList = graph.find(item => item["@type"] === "ItemList");
    if (!itemList || !itemList.itemListElement) {
      console.log("BuiltIn: No ItemList found in JSON-LD");
      return jobs;
    }

    for (const item of itemList.itemListElement) {
      // Extract job ID from URL (e.g., /job/title/8029223 -> 8029223)
      const urlMatch = item.url?.match(/\/(\d+)$/);
      const externalId = urlMatch ? urlMatch[1] : item.url;

      jobs.push({
        source: "builtin",
        externalId: externalId,
        url: item.url?.startsWith("http") ? item.url : `${BUILTIN_BASE}${item.url}`,
        title: item.name,
        company: "Unknown", // Not in JSON-LD summary, would need detail fetch
        location: "Seattle, WA",
        salaryRange: null,
        postedAt: new Date(),
        description: item.description || null,
        companySize: null,
        roleCategory: category
      });
    }
  } catch (error) {
    console.error("BuiltIn: Failed to parse JSON-LD:", error.message);
  }

  return jobs;
}

export default { scrapeBuiltIn };
