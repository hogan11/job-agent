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
