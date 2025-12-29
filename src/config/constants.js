export const SEARCH_QUERIES = {
  strategic: [
    "VP Strategy",
    "Director Strategy",
    "Chief of Staff",
    "Business Transformation",
    "Strategic Planning Director"
  ],
  program: [
    "Senior Program Manager",
    "Director Program Management",
    "PMO Director",
    "Portfolio Manager",
    "Transformation Lead"
  ],
  procurement: [
    "Procurement Director",
    "Strategic Sourcing Director",
    "VP Procurement",
    "Supply Chain Director",
    "Vendor Management Director"
  ],
  techLeadership: [
    "IT Director",
    "VP Digital Transformation",
    "Director Information Technology",
    "Digital Strategy Director"
  ]
};

export const LOCATION = "Seattle, WA";

export const PRIORITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50
};

export const DEPRIORITIZE_COMPANIES = [
  "Amazon",
  "AWS",
  "Amazon Web Services"
];

// Companies to completely skip (don't even store in DB)
export const SKIP_COMPANIES = [
  "Microsoft",
  "Amazon",
  "AWS",
  "Amazon Web Services"
];

// Title keywords to skip (case-insensitive)
export const SKIP_TITLE_KEYWORDS = [
  "fundraising",
  "sales",
  "payroll"
];

// Score threshold for generating cover letters
export const COVER_LETTER_THRESHOLD = 95;

export const APIFY_ACTORS = {
  linkedin: "anchor/linkedin-jobs-scraper",
  indeed: "misceres/indeed-scraper",
  glassdoor: "bebity/glassdoor-scraper",
  ziprecruiter: "epctex/ziprecruiter-scraper"
};

// Test mode limits - set via environment or override here
export const LIMITS = {
  // How many search queries to use per category (null = all)
  queriesPerCategory: process.env.LIMIT_QUERIES ? parseInt(process.env.LIMIT_QUERIES) : null,

  // Max jobs to fetch per scraper run (null = default 25)
  maxJobsPerScraper: process.env.LIMIT_JOBS_PER_SCRAPER ? parseInt(process.env.LIMIT_JOBS_PER_SCRAPER) : null,

  // Max jobs to score per batch (default 20)
  maxJobsToScore: process.env.LIMIT_SCORE_BATCH ? parseInt(process.env.LIMIT_SCORE_BATCH) : 20,

  // Which scrapers to run (null = all, or array like ["linkedin", "indeed"])
  enabledScrapers: process.env.ENABLED_SCRAPERS ? process.env.ENABLED_SCRAPERS.split(",") : null
};
