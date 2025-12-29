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
  raw_job_id UUID NOT NULL REFERENCES raw_jobs(id) ON DELETE CASCADE,
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
  scored_job_id UUID NOT NULL REFERENCES scored_jobs(id) ON DELETE CASCADE,
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
CREATE INDEX idx_scored_jobs_raw_job_id ON scored_jobs(raw_job_id);
CREATE INDEX idx_applications_scored_job_id ON applications(scored_job_id);
