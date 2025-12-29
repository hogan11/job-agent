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
