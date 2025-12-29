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

export const APIFY_ACTORS = {
  linkedin: "anchor/linkedin-jobs-scraper",
  indeed: "misceres/indeed-scraper",
  glassdoor: "bebity/glassdoor-scraper",
  ziprecruiter: "epctex/ziprecruiter-scraper"
};
