# QBTC Community Hub
Idea board + public roadmap for the QBTC community. Express + JSON-file DB, single Docker container.

## Run locally
`npm install && ADMIN_TOKEN=secret npm start` -> http://localhost:3000

## Deploy on Coolify
1. Push this repo to GitHub, then in Coolify: New Resource -> Public/Private Repository -> Build Pack: **Dockerfile**.
2. Port: **3000**. Add env var `ADMIN_TOKEN` (long random string).
3. Storage -> add Persistent Volume, destination path **/data** (db.json + uploads yahin save hote hain).
4. Set your domain (HTTPS) and deploy. Health check: `/healthz`.

## Security
helmet + strict CSP, rate limiting, input sanitising, no innerHTML (XSS-safe rendering), image magic-byte validation (2 MB, max 3), non-root container, timing-safe admin token, atomic JSON writes.
Note: yeh demo version hai, real user login (wallet/email) next phase me add karna.
