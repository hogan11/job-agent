# Job Hunter Agent - System Design

**Created:** 2024-12-28
**Status:** Validated
**Budget:** ~$89/month (under $150 limit)

## Overview

Automated job search system that finds newly posted jobs (within the hour) across multiple sources, scores them with AI against Albert's profile, and sends real-time notifications for high-match opportunities.

## Target Profile

**Candidate:** Albert Hogan
- 25+ years in product/program management and strategic sourcing
- Masters in Cybersecurity + Masters in Information Management
- Skills: Enterprise AI, automation (Zapier, Make.com), strategic IT sourcing
- Languages: English, German
- Location: Seattle/Tacoma (open to remote/hybrid/onsite)

**Target Role Categories:**
1. Strategic/Leadership - VP Strategy, Director Strategy, Chief of Staff, Business Transformation
2. Program/Portfolio Management - Senior PM, PMO Director, Portfolio Manager
3. Procurement/Sourcing - Procurement Director, Strategic Sourcing Director, VP Procurement
4. Technology Leadership - IT Director, VP Digital Transformation (no CISO)

**Company Preferences:**
- Preferred: Mid-market (500-5000), growth-stage startups, public sector/government
- Deprioritize: Fortune 500, especially Amazon/AWS (ghost job risk)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SCHEDULER (Every 30 min)                     │
│                              Railway.app                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         APIFY SCRAPER LAYER                          │
├─────────────┬─────────────┬──────────────┬─────────────┬────────────┤
│  LinkedIn   │   Indeed    │  Glassdoor   │   USAJobs   │  Company   │
│   Actor     │   Actor     │    Actor     │    Actor    │   Pages    │
└─────────────┴─────────────┴──────────────┴─────────────┴────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                            │
│  • Raw jobs table (deduped by URL)                                   │
│  • Scored jobs table (with AI rankings)                              │
│  • Application tracking table                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI TRIAGE (Claude API)                       │
│  • Score 1-100 fit against profile                                   │
│  • Flag likely ghost jobs                                            │
│  • Generate cover letter draft                                       │
│  • Deprioritize Amazon/AWS                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────┬──────────────────────────────────────┐
│      DISCORD WEBHOOK         │           EMAIL DIGEST                │
│  (Real-time high-match jobs) │      (8am + 5pm summary)             │
└──────────────────────────────┴──────────────────────────────────────┘
```

## Component Details

### 1. Apify Scraper Layer

| Source | Apify Actor | Frequency |
|--------|-------------|-----------|
| LinkedIn | `anchor/linkedin-jobs-scraper` | Every 30 min |
| Indeed | `misceres/indeed-scraper` | Every 30 min |
| Glassdoor | `bebity/glassdoor-scraper` | Every 60 min |
| ZipRecruiter | `epctex/ziprecruiter-scraper` | Every 60 min |
| BuiltIn Seattle | Custom actor | Every 60 min |
| USAJobs | Official API (free) | Every 60 min |

**Search queries per role category:**
```javascript
const searchQueries = {
  strategic: [
    "VP Strategy", "Director Strategy", "Chief of Staff",
    "Business Transformation", "Strategic Planning Director"
  ],
  program: [
    "Senior Program Manager", "Director Program Management",
    "PMO Director", "Portfolio Manager", "Transformation Lead"
  ],
  procurement: [
    "Procurement Director", "Strategic Sourcing Director",
    "VP Procurement", "Supply Chain Director", "Vendor Management"
  ],
  techLeadership: [
    "IT Director", "VP Digital Transformation",
    "Director Information Technology", "Digital Strategy Director"
  ]
};
```

### 2. Database Schema (Supabase)

```sql
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
```

### 3. AI Triage (Claude API)

**Scoring factors:**
| Factor | Impact |
|--------|--------|
| Role match to 4 categories | +30 pts max |
| Seniority level (Director/VP) | +20 pts max |
| Company size (mid-market/startup/gov) | +15 pts max |
| Skills alignment | +20 pts max |
| Location fit | +15 pts max |
| Amazon/AWS | -30 pts penalty |
| Vague description (ghost job signal) | -20 pts penalty |

**Priority tiers:**
- High (80-100): Immediate Discord alert
- Medium (50-79): Email digest only
- Low (<50): Stored, not notified

**API usage:**
- Haiku for initial scoring
- Sonnet for cover letters (high-tier only)

### 4. Notifications

**Discord channels:**
- `#high-priority` - Score 80+, immediate
- `#all-jobs` - Everything 50+
- `#daily-digest` - Summary at 8am

**Email digest (Resend):**
- 8am daily summary
- 5pm weekday summary

### 5. Hosting (Railway.app)

**Cron schedule:**
```
# Scraping (business hours)
*/30 6-20 * * 1-5    # Every 30 min, 6am-8pm, Mon-Fri
0 8,12,18 * * 0,6    # 3x on weekends

# Email digests
0 8 * * *            # 8am daily
0 17 * * 1-5         # 5pm weekdays
```

## Project Structure

```
job-agent/
├── src/
│   ├── scrapers/
│   │   ├── linkedin.js
│   │   ├── indeed.js
│   │   ├── glassdoor.js
│   │   ├── usajobs.js
│   │   └── builtin.js
│   ├── services/
│   │   ├── apify.js
│   │   ├── supabase.js
│   │   ├── claude.js
│   │   ├── discord.js
│   │   └── email.js
│   ├── jobs/
│   │   ├── scrape.js
│   │   ├── score.js
│   │   └── notify.js
│   └── index.js
├── .env
├── package.json
└── railway.json
```

## Cost Breakdown

| Service | Cost |
|---------|------|
| Apify (Starter plan) | $49/mo |
| Claude API | ~$30/mo |
| Railway hosting | ~$10/mo |
| Supabase | Free |
| Discord | Free |
| Resend email | Free |
| **Total** | **~$89/mo** |

## Success Criteria

1. Jobs scraped within 30 minutes of posting
2. AI scoring completes within 5 minutes of scraping
3. High-priority alerts delivered within 1 minute of scoring
4. Resume submitted in first 50 applicants for high-match jobs
5. Track application status through to outcome
