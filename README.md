# StudyBuddy 2.1 — deployable full-stack study companion

StudyBuddy is a React + Vite frontend with an Express API. The app includes account registration/login, subject and syllabus tracking, an exam-aware study planner, Pomodoro sessions, study analytics, spaced-repetition flashcards, quizzes, a study coach, text-based PDF extraction, and `.ics` calendar export.

## What changed in 2.1

- Replaced the JSON-file persistence layer with SQLite (`node:sqlite`) and enabled WAL + a busy timeout. The old `data/db.json` is imported automatically on first start if it exists.
- Production refuses to start without a strong `JWT_SECRET` (at least 32 characters); there is no insecure production fallback.
- Added Helmet security headers, API request limits, stricter JSON body limits, and sign-in/register rate limiting.
- CORS is restricted to configured origins. Same-origin deployment works without a separate frontend host; add custom frontend origins to `CORS_ORIGINS` if you split the frontend and API.
- Express serves the built Vite frontend in production, so a single service can host both UI and API.
- Added a Render Blueprint with a persistent disk for the SQLite database and uploads.
- Added Node version requirements and deployment notes.

## Requirements

- Node.js **22.5 or newer** (Node 22 LTS or newer recommended; `node:sqlite` is used).
- npm.
- Optional: Ollama for locally hosted AI features. Without a reachable Ollama service, the planner, quiz and coach use their built-in fallback behavior.

## Run locally

```bash
npm install
cp .env.example .env
```

Set a unique secret before creating accounts:

```bash
openssl rand -base64 48
```

Put the generated value in `.env` as `JWT_SECRET`, then run:

```bash
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:8787` and Vite proxies `/api` during development.

Optional local AI:

```bash
ollama pull llama3.2:1b
ollama serve
```

## Deploy to Render (single-service deployment)

1. Push this project to a GitHub repository.
2. In Render, choose **New + → Blueprint** and select that repository. Render reads `render.yaml`.
3. Confirm the web service and its persistent disk. The Blueprint requests a 1 GB disk mounted at `/var/data`.
4. Deploy. Render generates `JWT_SECRET` automatically. `DATA_DIR` and `UPLOAD_DIR` point to the persistent disk.
5. Open the service URL and register a test account. Verify login, subject creation, planner generation, PDF upload, flashcards and calendar export.

The included Blueprint uses Render's paid `starter` web service and persistent disk. If you choose another host, configure equivalent persistent storage; do not deploy the SQLite database to an ephemeral filesystem. Back up `/var/data/studybuddy.sqlite` regularly.

### Custom domains / split frontend and backend

The default deployment serves frontend and API from one origin, which is the simplest setup. If you host the frontend separately, set `CORS_ORIGINS` on the API to a comma-separated list of exact trusted origins, e.g. `https://your-frontend.example`. Do not use `*` for a production app with accounts.

### AI configuration

The deployed service does not include an Ollama model server. AI-related features will use their documented fallback behavior unless you provide a reachable Ollama-compatible endpoint via `OLLAMA_URL` and set `OLLAMA_MODEL`. Keep private AI endpoint credentials in host environment variables, never in source control. The `/api/health` endpoint reports whether the configured Ollama endpoint responds.

## Environment variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production` on the host. |
| `PORT` | Port provided by the hosting platform. |
| `JWT_SECRET` | Required in production; at least 32 characters. |
| `DATA_DIR` | Directory for `studybuddy.sqlite`; must be persistent in production. |
| `UPLOAD_DIR` | Temporary PDF upload directory; use persistent storage if you need to retain uploads. |
| `CORS_ORIGINS` | Comma-separated trusted frontend origins. Leave empty for same-origin hosting. |
| `MAX_UPLOAD_MB` | Maximum PDF upload size (default 10 MB). |
| `OLLAMA_URL` | Optional Ollama-compatible API URL. |
| `OLLAMA_MODEL` | Optional model name (default `llama3.2:1b`). |

## Verification

```bash
npm run check
npm run build
npm test
```

The test suite currently covers the deterministic planner. Before public launch, add integration tests for authentication, user-data isolation, PDF upload, and production hosting; test with a staging account and configure backups/monitoring.

## Known limitations — read before public launch

- SQLite is a good fit for a small single-instance app. Run one application instance with a persistent disk. For multiple app instances, high write concurrency, or a larger user base, migrate to managed PostgreSQL.
- The app currently stores its application collections as a JSON snapshot inside SQLite. SQLite provides durable atomic persistence, but this is not yet a normalized relational schema or a multi-instance data architecture.
- Rate limits are in-memory and reset on restart; for multiple instances, use a shared rate-limit store.
- PDF extraction supports text-based PDFs, not scanned image-only documents requiring OCR. Temporary uploaded PDF files are deleted after extraction; extracted text is stored in the database.
- Ollama is optional and is not bundled with Render. Without an external model endpoint, AI features use fallback responses.
- Calendar support exports `.ics`; it does not perform direct Google Calendar OAuth synchronization.
- This is a substantially hardened student project/demo deployment, not a security-audited SaaS platform. Before opening registration widely, perform a security review, add integration tests, configure database backups and monitoring, and consider email verification/password reset and CSRF/session hardening.

## Project structure

```text
studybuddy-upgraded/
├── server/
│   ├── index.js          # Express API, auth, security middleware and production static hosting
│   ├── planner.js        # deterministic fallback planner
│   └── store.js          # SQLite persistence + legacy JSON migration
├── src/
│   ├── main.jsx          # React application
│   └── styles.css        # responsive UI
├── tests/
│   └── planner.test.js
├── render.yaml           # Render Blueprint
├── .env.example
└── package.json
```
