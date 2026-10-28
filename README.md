# CU Hub

So this started because I was tired of the chaos. Someone loses their ID card, they spam 6 WhatsApp groups. Someone has last year's DSA paper, it lives on their phone and nowhere else. Someone's selling their old laptop, they post it in the hostel corridor. Everything was scattered and I just wanted one place that worked.

I'm a CSE student at CURAJ and I built this over the past few months. It's not perfect but it works, and actual students here use it.

---

## Features

- **Marketplace** — buy and sell books, electronics, stationery. Contact the seller directly through the app
- **Lost & Found** — report what you lost or what you found. Mark it resolved when it's sorted
- **Notes & PYQs** — upload PDFs or Drive links, filtered by department/semester/subject. This one gets used the most
- **Events** — post workshops, club events, hackathons. Anything happening on campus
- **Bookmarks** — save any listing, note, or event for later
- **AI Assistant** — retrieval-augmented generation (RAG): retrieves relevant CURAJ documents from the `Curaj_Data` Weaviate collection and uses Gemini to generate grounded answers. Both the floating popup and full assistant page use the same backend endpoint and keep their existing UI.
- **Forgot Password** — enrollment number → magic reset link sent to `enrollment@curaj.ac.in`. Rate limited to 2 requests per 3 hours per student. Token expires in 15 minutes
- **Admin panel** — `/admin` route, for moderation and managing content. Protected with lockout after 5 failed attempts

Login is phone number + password, linked to your enrollment number.

---

## Tech

Backend is Node.js + Express. Frontend is plain HTML/CSS/JS — no React, no build step, just files. Database is PostgreSQL. Images and PDFs go to Cloudinary. Deployed on Render. Password reset emails via Brevo (free — 300/day).

I deliberately kept it simple. No framework meant I could understand every line and debug things quickly. The whole frontend is one HTML file with JS modules loaded in order.

---

## Running it locally

```bash
git clone https://github.com/YASHAGARWAL07/cu-hub.git
cd cu-hub
npm install
node setup-admin.js
npm run dev
```

Then open `http://localhost:3000`. Admin panel is at `http://localhost:3000/admin`.

You need a PostgreSQL database. I use [Neon](https://neon.tech) — free tier, takes 2 minutes to set up. Tables get created automatically when the server starts, nothing manual.

---

## AI Assistant setup (Weaviate RAG)

The existing chatbot interfaces call `POST /api/ai/chat` and are intentionally unchanged. The endpoint now runs the standalone chatbot's retrieval-augmented approach directly in the Node server: it searches the Weaviate `Curaj_Data` collection, passes the retrieved text to Gemini, and returns the answer. No separate Flask server is required.

Before enabling the assistant, make sure your Weaviate Cloud cluster is reachable and the `Curaj_Data` collection has been populated. The collection needs a `text_content` text property and should have `file_name` for source labels. The collection's vectorizer must support `nearText` queries, as in the original chatbot setup. Set `WEAVIATE_URL`, `WEAVIATE_API_KEY`, and `GEMINI_API_KEY` in the environment. You can use `GOOGLE_API_KEY` instead of `GEMINI_API_KEY` if you want to keep the standalone chatbot's variable name. Never commit real API keys or the standalone chatbot's `.env` file.

If the Weaviate collection is empty, the assistant will say it could not find relevant documents rather than pretending that a canned answer came from the knowledge base.

---

## Deploying (Render)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect the repo
3. It reads `render.yaml` automatically, build/start commands are already set
4. Add these env vars in the Render dashboard:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → Connection String |
| `ADMIN_USER` | from `node setup-admin.js` |
| `ADMIN_PASS_HASH` | from `node setup-admin.js` |
| `ADMIN_TOKEN_HASH` | from `node setup-admin.js` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary → Settings → API Keys |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → API Keys (free) |
| `WEAVIATE_URL` | URL of the Weaviate Cloud cluster holding `Curaj_Data` |
| `WEAVIATE_API_KEY` | API key for that Weaviate Cloud cluster |
| `WEAVIATE_COLLECTION` | Collection name; defaults to `Curaj_Data` |
| `GEMINI_MODEL` | Optional; defaults to `gemini-3.8-flash` |
| `BREVO_API_KEY` | [brevo.com](https://brevo.com) → Settings → SMTP & API → API Keys (free) |
| `SENDER_EMAIL` | Gmail address for sending reset emails |
| `APP_URL` | Your Render app URL e.g. `https://cu-hub.onrender.com` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGIN` | optional, same as APP_URL |
| `PASSWORD_PEPPER` | optional, random string for extra password security |

First deploy takes a couple minutes. After that it redeploys automatically on every push.

> **Tip:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping your app every 5 minutes so Render's free tier never sleeps.

---

## Services Used

| Service | What for | Free tier |
|---|---|---|
| [Render](https://render.com) | Hosting | 750 hrs/month |
| [Neon](https://neon.tech) | PostgreSQL database | 0.5 GB |
| [Cloudinary](https://cloudinary.com) | Image + PDF storage | 25 GB |
| [Brevo](https://brevo.com) | Password reset emails | 300 emails/day |
| [Google AI Studio](https://aistudio.google.com) | Gemini answer generation | Depends on the current model and account limits |
| [Weaviate Cloud](https://weaviate.io) | Semantic retrieval over CURAJ documents | Depends on cluster plan |
| [UptimeRobot](https://uptimerobot.com) | Keep Render awake | 50 monitors |

---

## Security

- PBKDF2 (100,000 iterations, SHA-512) password hashing with per-user salt + pepper
- Timing-safe comparisons everywhere (no timing attacks)
- Rate limiting on every endpoint with correct IP detection behind Render's load balancer
- Session IDs are 96-char cryptographically random hex strings
- Magic byte validation on all file uploads (not just MIME type)
- Content Security Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control
- SQL injection prevention — all queries fully parameterised
- SSRF protection in URL sanitizer (blocks local network + cloud metadata endpoints)
- XSS prevention — input sanitized with unicode normalisation, null byte removal, HTML tag stripping
- Admin SQL endpoint restricted to SELECT-only with semicolon + comment blocking
- Double URL-decode check against path traversal bypass
- Account lockout after 5 failed login attempts (30 min)
- Password reset tokens expire in 15 minutes, one-time use only
- Automatic cleanup of expired tokens every hour
- Admin CRUD tables whitelisted — no arbitrary table access
- Error handler never leaks stack traces in production

---

## Why Cloudinary for files

Render's filesystem resets every time you redeploy. If I stored uploads on disk, every new deploy would wipe all the profile photos, marketplace images, and PDFs. Cloudinary stores them externally so they survive. Their free tier gives 25 GB which is more than enough.

---

## Project structure

```
cu-hub/
├── server/
│   ├── server.js              # main Express app, security middleware, admin API
│   ├── database.js            # Postgres pool + auto schema creation + migrations
│   ├── middleware.js          # auth, rate limiting, file upload (memory storage)
│   ├── storage.js             # Cloudinary upload, delete, download URL builder
│   ├── utils.js               # PBKDF2 hashing, sanitize, sanitizeUrl, timing-safe compare
│   ├── email.js               # Brevo transactional email (password reset)
│   ├── env-check.js           # fails fast if required env vars are missing
│   ├── curaj-knowledge.json   # legacy CURAJ reference data (not used by the RAG endpoint)
│   ├── ai-rag.js              # Weaviate retrieval + Gemini answer generation
│   ├── controllers/
│   │   ├── authController.js  # register, login, logout, changePassword, forgotPassword, resetPassword
│   │   ├── notesController.js
│   │   ├── marketplaceController.js
│   │   ├── eventsController.js
│   │   ├── lostfoundController.js
│   │   └── feedbackController.js
│   └── routes/
├── public/
│   ├── index.html             # entire frontend in one HTML file
│   ├── admin.html             # admin panel
│   ├── css/styles.css
│   └── js/
│       ├── core/              # router, utils, theme, avatar, security, curaj-data
│       ├── modules/
│       │   ├── ai/
│       │   │   ├── index.js   # full AI page
│       │   │   └── popup.js   # floating AI widget (FAB + bottom sheet on mobile)
│       │   └── marketplace, notes, events, lostfound, bookmarks, profile, auth
│       └── services/          # api.js (fetch wrapper), authService.js
├── setup-admin.js             # generates admin credentials interactively
├── render.yaml                # Render deploy config
└── .env.example               # all required env vars documented
```

---

## Notes

- `.env` is gitignored, never commit it
- DB schema is auto-created on startup, no migration files needed
- Admin sessions are in-memory (reset on redeploy) — intentional, short-lived (4 hours)
- Student sessions live in the DB so they survive deploys
- File uploads validate magic bytes server-side before hitting Cloudinary
- Every API endpoint has rate limiting
- AI assistant retrieves up to three relevant records from the configured Weaviate collection and sends bounded context to Gemini. The collection must already be populated with `text_content` and preferably `file_name` properties; the CampusHub app does not ingest or modify the collection.
- `trust proxy = 1` is set so rate limiting works correctly behind Render's load balancer
- `password_reset_tokens` table auto-created on first deploy with new code

---

Yash Agarwal — CSE, CURAJ  
[Portfolio](https://yashagarwalportfolio-roan.vercel.app) · [GitHub](https://github.com/YASHAGARWAL07) · [LinkedIn](https://www.linkedin.com/in/yash-agarwal0007/) · yashagarwal.connect@gmail.com
