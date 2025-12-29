# Job Hunter Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated job search system that scrapes jobs every 30 minutes, scores them with AI, and sends real-time Discord/email alerts for high-match opportunities.

**Architecture:** Node.js app on Railway that orchestrates Apify scrapers, stores jobs in Supabase, scores with Claude API, and notifies via Discord webhooks and Resend email.

**Tech Stack:** Node.js, Apify Client, Supabase JS, Anthropic SDK, Discord Webhooks, Resend, node-cron

---

## Phase 1: Project Foundation

### Task 1: Initialize Node.js Project

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Create package.json**

```bash
cd /Users/alberthogan/Development/job-agent
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js apify-client resend node-cron dotenv crypto
```

**Step 3: Install dev dependencies**

```bash
npm install -D vitest
```

**Step 4: Create .gitignore**

Create file `.gitignore`:
```
node_modules/
.env
.DS_Store
```

**Step 5: Create .env.example**

Create file `.env.example`:
```
# Apify
APIFY_TOKEN=your_apify_token

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Discord
DISCORD_WEBHOOK_HIGH_PRIORITY=https://discord.com/api/webhooks/xxx
DISCORD_WEBHOOK_ALL_JOBS=https://discord.com/api/webhooks/xxx

# Resend
RESEND_API_KEY=re_xxx
NOTIFICATION_EMAIL=your@email.com
```

**Step 6: Update package.json scripts**

Edit `package.json` to add scripts:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "scrape": "node src/jobs/scrape.js",
    "score": "node src/jobs/score.js",
    "notify": "node src/jobs/notify.js",
    "test": "vitest"
  }
}
```

**Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "feat: initialize project with dependencies"
```

---

### Task 2: Create Project Directory Structure

**Files:**
- Create: `src/` directory structure

**Step 1: Create directories**

```bash
mkdir -p src/scrapers src/services src/jobs src/config
```

**Step 2: Create placeholder files**

```bash
touch src/index.js
touch src/config/constants.js
touch src/config/profile.js
touch src/services/apify.js
touch src/services/supabase.js
touch src/services/claude.js
touch src/services/discord.js
touch src/services/email.js
touch src/scrapers/linkedin.js
touch src/scrapers/indeed.js
touch src/scrapers/glassdoor.js
touch src/scrapers/usajobs.js
touch src/scrapers/builtin.js
touch src/jobs/scrape.js
touch src/jobs/score.js
touch src/jobs/notify.js
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add project directory structure"
```

---

### Task 3: Create Configuration Files

**Files:**
- Create: `src/config/constants.js`
- Create: `src/config/profile.js`

**Step 1: Create constants.js**

Create file `src/config/constants.js`:
```javascript
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
```

**Step 2: Create profile.js**

Create file `src/config/profile.js`:
```javascript
export const CANDIDATE_PROFILE = `
CANDIDATE: Albert Hogan

EXPERIENCE:
- 25+ years in product/program management and strategic sourcing
- Current: Senior leader at Brinks Incorporated
- Background: Procurement Director, Program Manager, Product Management Leader

EDUCATION:
- Masters in Cybersecurity
- Masters in Information Management

SKILLS:
- Enterprise AI applications and AI-driven process automation
- Generative AI tools (ChatGPT, OpenAI APIs, Claude)
- Automation platforms (Zapier, Make.com)
- Strategic IT sourcing and commercial negotiations
- Relationship management and vendor management

LANGUAGES:
- English (native)
- German

LOCATION:
- Seattle/Tacoma, Washington
- Open to: Remote, Hybrid, or On-site

TARGET ROLES:
1. Strategic/Leadership: VP Strategy, Director Strategy, Chief of Staff, Business Transformation Lead
2. Program/Portfolio Management: Senior Program Manager, PMO Director, Portfolio Manager
3. Procurement/Sourcing: Procurement Director, Strategic Sourcing Director, VP Procurement
4. Technology Leadership: IT Director, VP Digital Transformation

COMPANY PREFERENCES:
- Preferred: Mid-market (500-5000 employees), growth-stage startups, public sector/government
- Deprioritize: Fortune 500 (ghost job risk), especially Amazon/AWS
`;

export const SCORING_INSTRUCTIONS = `
Score this job 1-100 based on:

POSITIVE FACTORS:
- Role matches one of 4 target categories: +30 pts max
- Seniority level (Director/VP/Senior): +20 pts max
- Company size (mid-market/startup/government): +15 pts max
- Skills alignment (AI, sourcing, PM, automation): +20 pts max
- Location fit (Seattle area, remote, or hybrid): +15 pts max
- Signals of real job (specific team, urgent hiring, named manager): +10 pts

NEGATIVE FACTORS:
- Amazon/AWS/Amazon Web Services: -30 pts
- Vague description (no specific responsibilities): -20 pts
- Entry-level or junior role: -40 pts
- Unrelated industry with no transferable context: -20 pts

Ghost job signals to flag:
- Generic description copied across many postings
- No salary range and no specific team mentioned
- Posted for 30+ days
- Company known for resume harvesting
`;
```

**Step 3: Commit**

```bash
git add src/config/
git commit -m "feat: add search queries and candidate profile config"
```

---

## Phase 2: Database Setup

### Task 4: Set Up Supabase Tables

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql` (for reference)
- Create: `src/services/supabase.js`

**Step 1: Create migration file (for documentation)**

```bash
mkdir -p supabase/migrations
```

Create file `supabase/migrations/001_initial_schema.sql`:
```sql
-- Run this in Supabase SQL Editor

-- Raw jobs from scrapers
CREATE TABLE raw_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  external_id VARCHAR(255),
  url TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  company VARCHAR(255),
  location VARCHAR(255),
  salary_range VARCHAR(100),
  posted_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  description TEXT,
  company_size VARCHAR(50),
  job_hash VARCHAR(64) UNIQUE,
  processed BOOLEAN DEFAULT FALSE
);

-- AI-scored jobs
CREATE TABLE scored_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_job_id UUID REFERENCES raw_jobs(id),
  fit_score INTEGER,
  ghost_job_likelihood INTEGER,
  role_category VARCHAR(50),
  priority_tier VARCHAR(20),
  ai_reasoning TEXT,
  cover_letter_draft TEXT,
  key_requirements JSONB,
  scored_at TIMESTAMP DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

-- Application tracking
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scored_job_id UUID REFERENCES scored_jobs(id),
  status VARCHAR(50) DEFAULT 'interested',
  applied_at TIMESTAMP,
  notes TEXT,
  follow_up_date DATE,
  resume_version VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_raw_jobs_processed ON raw_jobs(processed);
CREATE INDEX idx_raw_jobs_source ON raw_jobs(source);
CREATE INDEX idx_scored_jobs_priority ON scored_jobs(priority_tier);
CREATE INDEX idx_scored_jobs_notified ON scored_jobs(notified);
```

**Step 2: Create Supabase service**

Create file `src/services/supabase.js`:
```javascript
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export function generateJobHash(job) {
  const hashInput = `${job.url}|${job.title}|${job.company}`.toLowerCase();
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

export async function insertRawJob(job) {
  const jobHash = generateJobHash(job);

  const { data, error } = await supabase
    .from("raw_jobs")
    .upsert(
      {
        source: job.source,
        external_id: job.externalId,
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location,
        salary_range: job.salaryRange,
        posted_at: job.postedAt,
        description: job.description,
        company_size: job.companySize,
        job_hash: jobHash,
        processed: false
      },
      { onConflict: "job_hash", ignoreDuplicates: true }
    )
    .select();

  if (error) throw error;
  return data;
}

export async function getUnprocessedJobs(limit = 50) {
  const { data, error } = await supabase
    .from("raw_jobs")
    .select("*")
    .eq("processed", false)
    .order("scraped_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function markJobProcessed(jobId) {
  const { error } = await supabase
    .from("raw_jobs")
    .update({ processed: true })
    .eq("id", jobId);

  if (error) throw error;
}

export async function insertScoredJob(scoredJob) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .insert({
      raw_job_id: scoredJob.rawJobId,
      fit_score: scoredJob.fitScore,
      ghost_job_likelihood: scoredJob.ghostJobLikelihood,
      role_category: scoredJob.roleCategory,
      priority_tier: scoredJob.priorityTier,
      ai_reasoning: scoredJob.aiReasoning,
      cover_letter_draft: scoredJob.coverLetterDraft,
      key_requirements: scoredJob.keyRequirements,
      notified: false
    })
    .select();

  if (error) throw error;
  return data[0];
}

export async function getUnnotifiedJobs(minScore = 50) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .select(`
      *,
      raw_jobs (*)
    `)
    .eq("notified", false)
    .gte("fit_score", minScore)
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markJobNotified(scoredJobId) {
  const { error } = await supabase
    .from("scored_jobs")
    .update({ notified: true })
    .eq("id", scoredJobId);

  if (error) throw error;
}

export async function getJobsForDigest(since) {
  const { data, error } = await supabase
    .from("scored_jobs")
    .select(`
      *,
      raw_jobs (*)
    `)
    .gte("scored_at", since.toISOString())
    .order("fit_score", { ascending: false });

  if (error) throw error;
  return data;
}

export default supabase;
```

**Step 3: Commit**

```bash
git add supabase/ src/services/supabase.js
git commit -m "feat: add Supabase schema and service"
```

---

## Phase 3: Scraper Services

### Task 5: Create Apify Client Wrapper

**Files:**
- Create: `src/services/apify.js`

**Step 1: Create Apify service**

Create file `src/services/apify.js`:
```javascript
import { ApifyClient } from "apify-client";

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN
});

export async function runActor(actorId, input) {
  console.log(`Running Apify actor: ${actorId}`);

  const run = await client.actor(actorId).call(input, {
    waitSecs: 300 // 5 minute timeout
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`Actor ${actorId} returned ${items.length} items`);
  return items;
}

export async function runActorAsync(actorId, input) {
  console.log(`Starting Apify actor (async): ${actorId}`);

  const run = await client.actor(actorId).start(input);
  return run.id;
}

export async function getRunResults(runId) {
  const run = await client.run(runId).get();

  if (run.status !== "SUCCEEDED") {
    if (run.status === "RUNNING") {
      return { status: "RUNNING", items: [] };
    }
    throw new Error(`Run ${runId} failed with status: ${run.status}`);
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return { status: "SUCCEEDED", items };
}

export default client;
```

**Step 2: Commit**

```bash
git add src/services/apify.js
git commit -m "feat: add Apify client wrapper service"
```

---

### Task 6: Create LinkedIn Scraper

**Files:**
- Create: `src/scrapers/linkedin.js`

**Step 1: Create LinkedIn scraper**

Create file `src/scrapers/linkedin.js`:
```javascript
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
```

**Step 2: Commit**

```bash
git add src/scrapers/linkedin.js
git commit -m "feat: add LinkedIn scraper with normalization"
```

---

### Task 7: Create Indeed Scraper

**Files:**
- Create: `src/scrapers/indeed.js`

**Step 1: Create Indeed scraper**

Create file `src/scrapers/indeed.js`:
```javascript
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
```

**Step 2: Commit**

```bash
git add src/scrapers/indeed.js
git commit -m "feat: add Indeed scraper with normalization"
```

---

### Task 8: Create Glassdoor Scraper

**Files:**
- Create: `src/scrapers/glassdoor.js`

**Step 1: Create Glassdoor scraper**

Create file `src/scrapers/glassdoor.js`:
```javascript
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
```

**Step 2: Commit**

```bash
git add src/scrapers/glassdoor.js
git commit -m "feat: add Glassdoor scraper with normalization"
```

---

### Task 9: Create USAJobs Scraper (Official API)

**Files:**
- Create: `src/scrapers/usajobs.js`

**Step 1: Create USAJobs scraper**

Create file `src/scrapers/usajobs.js`:
```javascript
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
```

**Step 2: Commit**

```bash
git add src/scrapers/usajobs.js
git commit -m "feat: add USAJobs scraper using official API"
```

---

### Task 10: Create BuiltIn Seattle Scraper

**Files:**
- Create: `src/scrapers/builtin.js`

**Step 1: Create BuiltIn scraper**

Create file `src/scrapers/builtin.js`:
```javascript
import { SEARCH_QUERIES } from "../config/constants.js";

const BUILTIN_BASE = "https://www.builtinseattle.com";

export async function scrapeBuiltIn(category = null) {
  const queries = category
    ? SEARCH_QUERIES[category]
    : Object.values(SEARCH_QUERIES).flat();

  const allJobs = [];

  // BuiltIn has category pages we can scrape
  // For now, we'll use a simple fetch approach
  // In production, you might want a custom Apify actor

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

      // Basic parsing - in production, use proper HTML parser or Apify actor
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
  // Simplified parsing - extract job cards
  // In production, use cheerio or a dedicated Apify actor
  const jobs = [];

  // Match job listing patterns (simplified regex approach)
  const jobPattern = /data-job-id="(\d+)".*?href="([^"]+)".*?class="[^"]*job-title[^"]*"[^>]*>([^<]+)/gs;
  const companyPattern = /class="[^"]*company-name[^"]*"[^>]*>([^<]+)/g;

  let match;
  while ((match = jobPattern.exec(html)) !== null) {
    jobs.push({
      source: "builtin",
      externalId: match[1],
      url: match[2].startsWith("http") ? match[2] : `${BUILTIN_BASE}${match[2]}`,
      title: match[3].trim(),
      company: "Unknown", // Would need better parsing
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
```

**Step 2: Commit**

```bash
git add src/scrapers/builtin.js
git commit -m "feat: add BuiltIn Seattle scraper"
```

---

## Phase 4: AI Scoring Service

### Task 11: Create Claude AI Triage Service

**Files:**
- Create: `src/services/claude.js`

**Step 1: Create Claude service**

Create file `src/services/claude.js`:
```javascript
import Anthropic from "@anthropic-ai/sdk";
import { CANDIDATE_PROFILE, SCORING_INSTRUCTIONS } from "../config/profile.js";
import { PRIORITY_THRESHOLDS, DEPRIORITIZE_COMPANIES } from "../config/constants.js";

const anthropic = new Anthropic();

export async function scoreJob(job) {
  const prompt = buildScoringPrompt(job);

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    return parseScoreResponse(content, job);
  } catch (error) {
    console.error(`Claude scoring failed for job ${job.id}:`, error.message);
    return null;
  }
}

function buildScoringPrompt(job) {
  const isDeprioritized = DEPRIORITIZE_COMPANIES.some(
    company => job.company?.toLowerCase().includes(company.toLowerCase())
  );

  return `${CANDIDATE_PROFILE}

${SCORING_INSTRUCTIONS}

${isDeprioritized ? "NOTE: This company (Amazon/AWS) should be heavily deprioritized (-30 pts).\n" : ""}

JOB TO SCORE:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary_range || "Not specified"}
Description: ${job.description?.slice(0, 3000) || "No description available"}

Respond in this exact JSON format:
{
  "fit_score": <number 1-100>,
  "ghost_job_likelihood": <number 1-100>,
  "role_category": "<strategic|program|procurement|techLeadership|other>",
  "reasoning": "<2-3 sentences explaining the score>",
  "key_requirements": ["<requirement 1>", "<requirement 2>", "<requirement 3>"]
}`;
}

function parseScoreResponse(content, job) {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Determine priority tier
    let priorityTier = "low";
    if (parsed.fit_score >= PRIORITY_THRESHOLDS.HIGH) {
      priorityTier = "high";
    } else if (parsed.fit_score >= PRIORITY_THRESHOLDS.MEDIUM) {
      priorityTier = "medium";
    }

    return {
      rawJobId: job.id,
      fitScore: parsed.fit_score,
      ghostJobLikelihood: parsed.ghost_job_likelihood,
      roleCategory: parsed.role_category,
      priorityTier,
      aiReasoning: parsed.reasoning,
      keyRequirements: parsed.key_requirements,
      coverLetterDraft: null // Will be generated separately for high priority
    };
  } catch (error) {
    console.error("Failed to parse Claude response:", error.message);
    return null;
  }
}

export async function generateCoverLetter(job, scoredJob) {
  const prompt = `${CANDIDATE_PROFILE}

Write a compelling 3-paragraph cover letter for this job opportunity.

JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description?.slice(0, 2000)}

KEY REQUIREMENTS IDENTIFIED:
${scoredJob.keyRequirements?.join("\n- ") || "Not specified"}

INSTRUCTIONS:
1. First paragraph: Hook - why this specific role at this specific company excites you
2. Second paragraph: Value - 2-3 specific examples from background that match their needs
3. Third paragraph: Close - enthusiasm and call to action

Keep it concise (under 300 words). Be specific, not generic.
Do not include placeholder text like [Company Name] - use the actual company name.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error(`Cover letter generation failed:`, error.message);
    return null;
  }
}

export default { scoreJob, generateCoverLetter };
```

**Step 2: Commit**

```bash
git add src/services/claude.js
git commit -m "feat: add Claude AI scoring and cover letter service"
```

---

## Phase 5: Notification Services

### Task 12: Create Discord Notification Service

**Files:**
- Create: `src/services/discord.js`

**Step 1: Create Discord service**

Create file `src/services/discord.js`:
```javascript
export async function sendHighPriorityAlert(scoredJob, rawJob) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_HIGH_PRIORITY;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_HIGH_PRIORITY not configured");
    return;
  }

  const embed = {
    title: `${rawJob.title}`,
    url: rawJob.url,
    color: 0xff6b6b, // Red for high priority
    fields: [
      {
        name: "Company",
        value: rawJob.company || "Unknown",
        inline: true
      },
      {
        name: "Location",
        value: rawJob.location || "Not specified",
        inline: true
      },
      {
        name: "Fit Score",
        value: `${scoredJob.fit_score}/100`,
        inline: true
      },
      {
        name: "Salary",
        value: rawJob.salary_range || "Not specified",
        inline: true
      },
      {
        name: "Category",
        value: formatCategory(scoredJob.role_category),
        inline: true
      },
      {
        name: "Ghost Risk",
        value: `${scoredJob.ghost_job_likelihood}%`,
        inline: true
      },
      {
        name: "Why This Fits",
        value: scoredJob.ai_reasoning?.slice(0, 1000) || "No analysis available"
      },
      {
        name: "Key Requirements",
        value: scoredJob.key_requirements?.slice(0, 5).map(r => `• ${r}`).join("\n") || "Not specified"
      }
    ],
    footer: {
      text: `Source: ${rawJob.source} | Posted: ${formatTimeAgo(rawJob.posted_at)}`
    },
    timestamp: new Date().toISOString()
  };

  await sendWebhook(webhookUrl, {
    content: `🔥 **HIGH MATCH (Score: ${scoredJob.fit_score})**`,
    embeds: [embed]
  });
}

export async function sendToAllJobsChannel(scoredJob, rawJob) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ALL_JOBS;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_ALL_JOBS not configured");
    return;
  }

  const priorityEmoji = scoredJob.priority_tier === "high" ? "🔥" : "📋";
  const color = scoredJob.priority_tier === "high" ? 0xff6b6b : 0x4ecdc4;

  const embed = {
    title: rawJob.title,
    url: rawJob.url,
    color,
    description: `**${rawJob.company}** • ${rawJob.location || "Location N/A"}`,
    fields: [
      {
        name: "Score",
        value: `${scoredJob.fit_score}/100`,
        inline: true
      },
      {
        name: "Category",
        value: formatCategory(scoredJob.role_category),
        inline: true
      },
      {
        name: "Salary",
        value: rawJob.salary_range || "N/A",
        inline: true
      }
    ],
    footer: {
      text: `${rawJob.source} | ${formatTimeAgo(rawJob.posted_at)}`
    }
  };

  await sendWebhook(webhookUrl, {
    content: `${priorityEmoji} New ${scoredJob.priority_tier} priority job`,
    embeds: [embed]
  });
}

async function sendWebhook(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Discord webhook error:", error.message);
  }
}

function formatCategory(category) {
  const labels = {
    strategic: "Strategic/Leadership",
    program: "Program Management",
    procurement: "Procurement/Sourcing",
    techLeadership: "Technology Leadership",
    other: "Other"
  };
  return labels[category] || category;
}

function formatTimeAgo(date) {
  if (!date) return "Unknown";
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now - posted;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default { sendHighPriorityAlert, sendToAllJobsChannel };
```

**Step 2: Commit**

```bash
git add src/services/discord.js
git commit -m "feat: add Discord webhook notification service"
```

---

### Task 13: Create Email Digest Service

**Files:**
- Create: `src/services/email.js`

**Step 1: Create email service**

Create file `src/services/email.js`:
```javascript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigestEmail(jobs, periodLabel = "Daily") {
  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!toEmail) {
    console.warn("NOTIFICATION_EMAIL not configured");
    return;
  }

  const highPriority = jobs.filter(j => j.priority_tier === "high");
  const mediumPriority = jobs.filter(j => j.priority_tier === "medium");

  const html = buildDigestHTML(highPriority, mediumPriority, periodLabel);

  try {
    await resend.emails.send({
      from: "Job Hunter <jobs@updates.yourdomain.com>",
      to: toEmail,
      subject: `${periodLabel} Job Digest: ${highPriority.length} high priority, ${mediumPriority.length} medium`,
      html
    });

    console.log(`Digest email sent to ${toEmail}`);
  } catch (error) {
    console.error("Email send failed:", error.message);
  }
}

function buildDigestHTML(highPriority, mediumPriority, periodLabel) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #e74c3c; margin-top: 30px; }
    h3 { color: #27ae60; margin-top: 30px; }
    .job-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
    .job-card.high { border-left-color: #e74c3c; }
    .job-title { font-size: 18px; font-weight: bold; color: #2c3e50; text-decoration: none; }
    .job-title:hover { text-decoration: underline; }
    .job-company { color: #7f8c8d; margin: 5px 0; }
    .job-meta { font-size: 14px; color: #95a5a6; }
    .score { display: inline-block; background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    .score.high { background: #e74c3c; }
    .stats { background: #ecf0f1; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📊 ${periodLabel} Job Digest</h1>

  <div class="stats">
    <strong>Summary:</strong> ${highPriority.length} high priority, ${mediumPriority.length} medium priority jobs found
  </div>

  ${highPriority.length > 0 ? `
  <h2>🔥 High Priority (Score 80+)</h2>
  ${highPriority.map(job => renderJobCard(job, true)).join("")}
  ` : ""}

  ${mediumPriority.length > 0 ? `
  <h3>📋 Medium Priority (Score 50-79)</h3>
  ${mediumPriority.map(job => renderJobCard(job, false)).join("")}
  ` : ""}

  ${highPriority.length === 0 && mediumPriority.length === 0 ? `
  <p>No new matching jobs found in this period. The search continues!</p>
  ` : ""}

  <hr style="margin-top: 40px; border: none; border-top: 1px solid #ecf0f1;">
  <p style="font-size: 12px; color: #95a5a6;">
    Job Hunter Agent • Automated job search for Albert Hogan
  </p>
</body>
</html>`;
}

function renderJobCard(scoredJob, isHigh) {
  const job = scoredJob.raw_jobs;
  return `
  <div class="job-card ${isHigh ? "high" : ""}">
    <a href="${job.url}" class="job-title">${job.title}</a>
    <div class="job-company">${job.company} • ${job.location || "Location N/A"}</div>
    <div class="job-meta">
      <span class="score ${isHigh ? "high" : ""}">${scoredJob.fit_score}</span>
      ${job.salary_range ? ` • ${job.salary_range}` : ""}
      • ${formatCategory(scoredJob.role_category)}
    </div>
    <p style="margin-top: 10px; font-size: 14px;">${scoredJob.ai_reasoning || ""}</p>
  </div>`;
}

function formatCategory(category) {
  const labels = {
    strategic: "Strategic/Leadership",
    program: "Program Management",
    procurement: "Procurement/Sourcing",
    techLeadership: "Technology Leadership",
    other: "Other"
  };
  return labels[category] || category;
}

export default { sendDigestEmail };
```

**Step 2: Commit**

```bash
git add src/services/email.js
git commit -m "feat: add email digest service with Resend"
```

---

## Phase 6: Job Orchestration

### Task 14: Create Scrape Job Orchestrator

**Files:**
- Create: `src/jobs/scrape.js`

**Step 1: Create scrape orchestrator**

Create file `src/jobs/scrape.js`:
```javascript
import "dotenv/config";
import { scrapeLinkedIn } from "../scrapers/linkedin.js";
import { scrapeIndeed } from "../scrapers/indeed.js";
import { scrapeGlassdoor } from "../scrapers/glassdoor.js";
import { scrapeUSAJobs } from "../scrapers/usajobs.js";
import { scrapeBuiltIn } from "../scrapers/builtin.js";
import { insertRawJob } from "../services/supabase.js";

const SCRAPERS = [
  { name: "LinkedIn", fn: scrapeLinkedIn, frequency: "30min" },
  { name: "Indeed", fn: scrapeIndeed, frequency: "30min" },
  { name: "Glassdoor", fn: scrapeGlassdoor, frequency: "60min" },
  { name: "USAJobs", fn: scrapeUSAJobs, frequency: "60min" },
  { name: "BuiltIn", fn: scrapeBuiltIn, frequency: "60min" }
];

export async function runAllScrapers() {
  console.log(`[${new Date().toISOString()}] Starting scrape run...`);

  const results = {
    total: 0,
    inserted: 0,
    duplicates: 0,
    errors: []
  };

  for (const scraper of SCRAPERS) {
    console.log(`Running ${scraper.name} scraper...`);

    try {
      const jobs = await scraper.fn();
      results.total += jobs.length;

      for (const job of jobs) {
        try {
          const inserted = await insertRawJob(job);
          if (inserted && inserted.length > 0) {
            results.inserted++;
          } else {
            results.duplicates++;
          }
        } catch (error) {
          if (error.code === "23505") {
            // Duplicate key - expected for existing jobs
            results.duplicates++;
          } else {
            console.error(`Insert error for ${job.title}:`, error.message);
            results.errors.push({ job: job.title, error: error.message });
          }
        }
      }

      console.log(`${scraper.name}: found ${jobs.length} jobs`);
    } catch (error) {
      console.error(`${scraper.name} scraper failed:`, error.message);
      results.errors.push({ scraper: scraper.name, error: error.message });
    }
  }

  console.log(`
Scrape complete:
  - Total jobs found: ${results.total}
  - New jobs inserted: ${results.inserted}
  - Duplicates skipped: ${results.duplicates}
  - Errors: ${results.errors.length}
`);

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllScrapers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Scrape failed:", error);
      process.exit(1);
    });
}

export default { runAllScrapers };
```

**Step 2: Commit**

```bash
git add src/jobs/scrape.js
git commit -m "feat: add scrape job orchestrator"
```

---

### Task 15: Create Score Job Orchestrator

**Files:**
- Create: `src/jobs/score.js`

**Step 1: Create score orchestrator**

Create file `src/jobs/score.js`:
```javascript
import "dotenv/config";
import { getUnprocessedJobs, markJobProcessed, insertScoredJob } from "../services/supabase.js";
import { scoreJob, generateCoverLetter } from "../services/claude.js";
import { PRIORITY_THRESHOLDS } from "../config/constants.js";

export async function runScoring(batchSize = 20) {
  console.log(`[${new Date().toISOString()}] Starting scoring run...`);

  const jobs = await getUnprocessedJobs(batchSize);
  console.log(`Found ${jobs.length} unprocessed jobs`);

  const results = {
    processed: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    errors: []
  };

  for (const job of jobs) {
    try {
      console.log(`Scoring: ${job.title} at ${job.company}`);

      const scored = await scoreJob(job);

      if (!scored) {
        console.warn(`Scoring returned null for job ${job.id}`);
        results.errors.push({ job: job.title, error: "Scoring returned null" });
        continue;
      }

      // Generate cover letter for high priority jobs
      if (scored.fitScore >= PRIORITY_THRESHOLDS.HIGH) {
        console.log(`Generating cover letter for high-priority job...`);
        scored.coverLetterDraft = await generateCoverLetter(job, scored);
        results.highPriority++;
      } else if (scored.fitScore >= PRIORITY_THRESHOLDS.MEDIUM) {
        results.mediumPriority++;
      } else {
        results.lowPriority++;
      }

      // Save scored job
      await insertScoredJob(scored);
      await markJobProcessed(job.id);

      results.processed++;

      // Rate limiting for Claude API
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.error(`Scoring error for ${job.title}:`, error.message);
      results.errors.push({ job: job.title, error: error.message });
    }
  }

  console.log(`
Scoring complete:
  - Processed: ${results.processed}
  - High priority: ${results.highPriority}
  - Medium priority: ${results.mediumPriority}
  - Low priority: ${results.lowPriority}
  - Errors: ${results.errors.length}
`);

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScoring()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Scoring failed:", error);
      process.exit(1);
    });
}

export default { runScoring };
```

**Step 2: Commit**

```bash
git add src/jobs/score.js
git commit -m "feat: add AI scoring job orchestrator"
```

---

### Task 16: Create Notify Job Orchestrator

**Files:**
- Create: `src/jobs/notify.js`

**Step 1: Create notify orchestrator**

Create file `src/jobs/notify.js`:
```javascript
import "dotenv/config";
import { getUnnotifiedJobs, markJobNotified, getJobsForDigest } from "../services/supabase.js";
import { sendHighPriorityAlert, sendToAllJobsChannel } from "../services/discord.js";
import { sendDigestEmail } from "../services/email.js";
import { PRIORITY_THRESHOLDS } from "../config/constants.js";

export async function sendNotifications() {
  console.log(`[${new Date().toISOString()}] Starting notification run...`);

  const jobs = await getUnnotifiedJobs(PRIORITY_THRESHOLDS.MEDIUM);
  console.log(`Found ${jobs.length} unnotified jobs`);

  const results = {
    notified: 0,
    highPriority: 0,
    errors: []
  };

  for (const scoredJob of jobs) {
    const rawJob = scoredJob.raw_jobs;

    try {
      // Send to all jobs channel
      await sendToAllJobsChannel(scoredJob, rawJob);

      // High priority gets extra alert
      if (scoredJob.fit_score >= PRIORITY_THRESHOLDS.HIGH) {
        await sendHighPriorityAlert(scoredJob, rawJob);
        results.highPriority++;
      }

      await markJobNotified(scoredJob.id);
      results.notified++;

      // Rate limiting for Discord
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`Notification error for ${rawJob?.title}:`, error.message);
      results.errors.push({ job: rawJob?.title, error: error.message });
    }
  }

  console.log(`
Notifications complete:
  - Total notified: ${results.notified}
  - High priority alerts: ${results.highPriority}
  - Errors: ${results.errors.length}
`);

  return results;
}

export async function sendDailyDigest() {
  console.log(`[${new Date().toISOString()}] Sending daily digest...`);

  // Get jobs from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const jobs = await getJobsForDigest(since);

  await sendDigestEmail(jobs, "Daily");

  console.log(`Daily digest sent with ${jobs.length} jobs`);
}

export async function sendEveningDigest() {
  console.log(`[${new Date().toISOString()}] Sending evening digest...`);

  // Get jobs from last 8 hours (since morning)
  const since = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const jobs = await getJobsForDigest(since);

  await sendDigestEmail(jobs, "Afternoon");

  console.log(`Evening digest sent with ${jobs.length} jobs`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "notify";

  const commands = {
    notify: sendNotifications,
    daily: sendDailyDigest,
    evening: sendEveningDigest
  };

  const fn = commands[command];
  if (!fn) {
    console.error(`Unknown command: ${command}`);
    console.log(`Available: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }

  fn()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Notify failed:", error);
      process.exit(1);
    });
}

export default { sendNotifications, sendDailyDigest, sendEveningDigest };
```

**Step 2: Commit**

```bash
git add src/jobs/notify.js
git commit -m "feat: add notification job orchestrator"
```

---

## Phase 7: Main Entry Point & Scheduler

### Task 17: Create Main Entry Point with Cron Scheduler

**Files:**
- Create: `src/index.js`

**Step 1: Create main entry point**

Create file `src/index.js`:
```javascript
import "dotenv/config";
import cron from "node-cron";
import { runAllScrapers } from "./jobs/scrape.js";
import { runScoring } from "./jobs/score.js";
import { sendNotifications, sendDailyDigest, sendEveningDigest } from "./jobs/notify.js";

console.log("🚀 Job Hunter Agent starting...");
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

// Validate required env vars
const requiredEnvVars = [
  "APIFY_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "ANTHROPIC_API_KEY"
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Main job pipeline
async function runPipeline() {
  console.log("\n" + "=".repeat(50));
  console.log(`Pipeline started at ${new Date().toISOString()}`);
  console.log("=".repeat(50));

  try {
    // Step 1: Scrape jobs
    await runAllScrapers();

    // Step 2: Score new jobs
    await runScoring();

    // Step 3: Send notifications
    await sendNotifications();

    console.log("Pipeline completed successfully");
  } catch (error) {
    console.error("Pipeline error:", error);
  }
}

// Schedule jobs
// Scraping pipeline: Every 30 minutes, 6am-8pm, Mon-Fri
cron.schedule("0,30 6-20 * * 1-5", () => {
  console.log("⏰ Scheduled run: Weekday pipeline");
  runPipeline();
}, {
  timezone: "America/Los_Angeles"
});

// Weekend: 3x daily at 8am, 12pm, 6pm
cron.schedule("0 8,12,18 * * 0,6", () => {
  console.log("⏰ Scheduled run: Weekend pipeline");
  runPipeline();
}, {
  timezone: "America/Los_Angeles"
});

// Daily digest: 8am every day
cron.schedule("0 8 * * *", () => {
  console.log("📧 Sending daily digest");
  sendDailyDigest();
}, {
  timezone: "America/Los_Angeles"
});

// Evening digest: 5pm weekdays
cron.schedule("0 17 * * 1-5", () => {
  console.log("📧 Sending evening digest");
  sendEveningDigest();
}, {
  timezone: "America/Los_Angeles"
});

// Run immediately on startup if requested
if (process.argv.includes("--run-now")) {
  console.log("Running pipeline immediately (--run-now flag)");
  runPipeline();
}

console.log(`
📅 Scheduled jobs:
  - Weekday pipeline: Every 30 min, 6am-8pm PT (Mon-Fri)
  - Weekend pipeline: 8am, 12pm, 6pm PT (Sat-Sun)
  - Daily digest: 8am PT
  - Evening digest: 5pm PT (Mon-Fri)

Use --run-now flag to run immediately on startup.
`);

// Keep process alive
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});
```

**Step 2: Commit**

```bash
git add src/index.js
git commit -m "feat: add main entry point with cron scheduler"
```

---

## Phase 8: Railway Deployment

### Task 18: Create Railway Configuration

**Files:**
- Create: `railway.json`
- Create: `Procfile`

**Step 1: Create railway.json**

Create file `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Step 2: Create Procfile (backup)**

Create file `Procfile`:
```
worker: node src/index.js
```

**Step 3: Update package.json for Node version**

Edit `package.json` to add engines:
```json
{
  "engines": {
    "node": ">=20.0.0"
  },
  "type": "module"
}
```

**Step 4: Commit**

```bash
git add railway.json Procfile package.json
git commit -m "feat: add Railway deployment configuration"
```

---

### Task 19: Create Setup Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create file `README.md`:
```markdown
# Job Hunter Agent

Automated job search system that finds newly posted jobs, scores them with AI, and sends real-time notifications.

## Setup

### 1. External Services

Create accounts and get API keys:

- **Apify** (https://apify.com) - $49/mo Starter plan
- **Supabase** (https://supabase.com) - Free tier
- **Anthropic** (https://console.anthropic.com) - API key
- **Discord** - Create server with webhooks
- **Resend** (https://resend.com) - Free tier

### 2. Supabase Database

Run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.

### 3. Discord Webhooks

1. Create a Discord server
2. Create channels: `#high-priority`, `#all-jobs`
3. For each channel: Settings → Integrations → Webhooks → New Webhook
4. Copy the webhook URLs

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

### 5. Local Development

```bash
npm install
npm start           # Start with scheduler
npm run scrape      # Run scraper only
npm run score       # Run scoring only
npm run notify      # Run notifications only
```

### 6. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

## Architecture

```
Apify Scrapers → Supabase → Claude AI → Discord/Email
     ↓              ↓           ↓            ↓
 LinkedIn       raw_jobs     scored      Webhooks
 Indeed                      _jobs       Resend
 Glassdoor
 USAJobs
 BuiltIn
```

## Cost

- Apify: $49/mo
- Claude API: ~$30/mo
- Railway: ~$10/mo
- **Total: ~$89/mo**
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup documentation"
```

---

## Phase 9: Testing & Verification

### Task 20: Manual Integration Test

**Step 1: Create .env file**

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

**Step 2: Run Supabase migration**

Open Supabase SQL Editor and run contents of `supabase/migrations/001_initial_schema.sql`

**Step 3: Test scraper**

```bash
npm run scrape
```

Expected: Jobs found from various sources, inserted into database

**Step 4: Test scoring**

```bash
npm run score
```

Expected: Unprocessed jobs scored, high priority jobs get cover letters

**Step 5: Test notifications**

```bash
npm run notify
```

Expected: Discord messages appear, no email errors

**Step 6: Test full pipeline**

```bash
node src/index.js --run-now
```

Expected: Full pipeline runs successfully

---

## Summary

**Total Tasks:** 20
**Estimated Implementation Time:** 4-6 hours

**Phase breakdown:**
- Phase 1 (Foundation): Tasks 1-3
- Phase 2 (Database): Task 4
- Phase 3 (Scrapers): Tasks 5-10
- Phase 4 (AI): Task 11
- Phase 5 (Notifications): Tasks 12-13
- Phase 6 (Orchestration): Tasks 14-16
- Phase 7 (Scheduler): Task 17
- Phase 8 (Deployment): Tasks 18-19
- Phase 9 (Testing): Task 20

**After implementation, you'll have:**
- Jobs scraped every 30 minutes from 5+ sources
- AI scoring with ghost job detection
- Instant Discord alerts for high-match jobs
- Auto-generated cover letters
- Email digests at 8am and 5pm
- Full application tracking in Supabase
