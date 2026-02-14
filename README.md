# more-2-rivers-agent

Production-ready Node.js (TypeScript) service that drafts and publishes Facebook Page content for the Two Rivers community in Zephyrhills/Pasco County.

## Features

- Daily source ingestion from editable `sources.json` (RSS + HTML) using only public web pages.
- Relevance filtering with primary keywords and denylist filtering in `denylist.json`.
- Draft queue persisted to SQLite (Prisma).
- SMS approval/rejection via Twilio (`A#ID`/`R#ID`).
- Immediate Facebook Page publish after approval via Graph API.
- Weekly scheduled market snapshot draft every Tuesday at 9:00 AM America/New_York.
- Optional Google Sheets append integration (`More2Rivers_Queue`).
- `/health` endpoint.
- Docker + docker-compose included.
- Tests for SMS parser + approval flow.

## Tech Stack

- TypeScript
- Express
- Prisma + SQLite
- node-cron
- Twilio
- Facebook Graph API
- Optional Google Sheets API

## Environment variables

Copy `.env.example` to `.env` and fill values:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `APPROVER_PHONE`
- `FB_PAGE_ID`
- `FB_PAGE_ACCESS_TOKEN`
- `OPENAI_API_KEY` (reserved for future language model prompt tuning)
- `BASE_URL`
- `GOOGLE_SHEETS_ID` (optional)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` (optional)
- `GOOGLE_PRIVATE_KEY` (optional)

## Local setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Server runs on `http://localhost:3000`.

## Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `POST /twilio/inbound` -> Twilio SMS webhook (`application/x-www-form-urlencoded`)

## Cron schedules

- Daily content job: `0 8 * * *` (8:00 AM America/New_York)
- Weekly market draft job: `0 9 * * 2` (Tuesday 9:00 AM America/New_York)

## Draft format

Generated post format:

```text
{Headline}
• bullet 1
• bullet 2
• bullet 3 (optional)
{One calm local context sentence.}
Source: {URL}
```

Rules enforced:

- Must match a primary keyword (`Two Rivers`, `Zephyrhills`, `SR-56`, `Pasco County`).
- Reject denylist categories for crime/tragedy/politics.
- No CTA language, contact instructions, YouTube mentions, or hype phrasing.

## Twilio webhook setup

1. In Twilio Console, configure inbound SMS webhook for your number.
2. Set webhook URL to:
   - `https://your-domain.com/twilio/inbound`
3. Ensure method is `POST`.

Example commands:

- Approve: `A12345`
- Reject: `R12345`

## Meta (Facebook Page API) setup

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com/).
2. Add Facebook Login and Pages permissions (`pages_manage_posts`, `pages_read_engagement`).
3. Generate a long-lived User token, then Page token for the target Page.
4. Put token in `FB_PAGE_ACCESS_TOKEN` and Page ID in `FB_PAGE_ID`.
5. Confirm app is in live mode and permissions approved for production use.

## Google Sheets optional module

If `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` are provided:

- Service appends each draft row to worksheet `More2Rivers_Queue`.
- Expected columns:
  `draft_id, date_found, type, headline, bullets, local_context, source_url, source_name, status, posted_at`

## Docker

```bash
docker compose up --build
```

## Testing

```bash
npx prisma generate
DATABASE_URL='file:./prisma/test.db' npx prisma db push
npm test
```

## Configuration files editable without code changes

- `sources.json`
- `denylist.json`

## Notes

- Scraping target is public web content only; no login/paywall scraping.
- Source dedupe is by URL hash + title hash in database.
