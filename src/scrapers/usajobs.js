import { SEARCH_QUERIES } from "../config/constants.js";

const USAJOBS_API_BASE = "https://data.usajobs.gov/api/search";

export async function scrapeUSAJobs(category = null) {
  const queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();

  const allJobs = [];

  for (const query of queries) {
    try {
      const response = await fetch(
        `${USAJOBS_API_BASE}?Keyword=${encodeURIComponent(query)}&LocationName=Seattle,+Washington&ResultsPerPage=25&DatePosted=1`,
        {
          headers: {
            "Host": "data.usajobs.gov",
            "User-Agent": "job-hunter-agent/1.0",
            "Authorization-Key": process.env.USAJOBS_API_KEY || ""
          }
        }
      );

      if (!response.ok) {
        console.error(`USAJobs API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data.SearchResult?.SearchResultItems || [];

      const normalizedJobs = items.map(item => normalizeUSAJob(item, category));
      allJobs.push(...normalizedJobs);

      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`USAJobs scrape failed for query "${query}":`, error.message);
    }
  }

  return allJobs;
}

function normalizeUSAJob(item, category) {
  const job = item.MatchedObjectDescriptor;

  return {
    source: "usajobs",
    externalId: job.PositionID,
    url: job.PositionURI,
    title: job.PositionTitle,
    company: job.OrganizationName || job.DepartmentName,
    location: job.PositionLocation?.[0]?.LocationName || "Washington",
    salaryRange: formatUSAJobsSalary(job),
    postedAt: job.PublicationStartDate ? new Date(job.PublicationStartDate) : new Date(),
    description: job.QualificationSummary || job.UserArea?.Details?.JobSummary,
    companySize: "government",
    roleCategory: category
  };
}

function formatUSAJobsSalary(job) {
  const min = job.PositionRemuneration?.[0]?.MinimumRange;
  const max = job.PositionRemuneration?.[0]?.MaximumRange;

  if (min && max) {
    return `$${parseInt(min).toLocaleString()} - $${parseInt(max).toLocaleString()}`;
  }
  return job.PositionRemuneration?.[0]?.Description || null;
}

export default { scrapeUSAJobs };
