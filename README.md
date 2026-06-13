# FanStream — Vercel IPTV Player

Deploy this to Vercel and get a public URL anyone can use to watch your M3U streams — no CORS issues.

## Project structure

```
fanstream-vercel/
├── api/
│   ├── playlist.js   ← fetches your M3U playlist
│   └── proxy.js      ← proxies HLS stream segments
├── public/
│   └── index.html    ← the player UI
└── vercel.json       ← routing config
```

## How to deploy (step by step)

### Step 1 — Push to GitHub
1. Create a new repo on github.com (name it anything, e.g. `fanstream`)
2. Upload all these files into it (drag & drop in the GitHub UI, or use git)

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com and sign up (free) with your GitHub account
2. Click **"Add New Project"**
3. Select your `fanstream` GitHub repo
4. Click **"Deploy"** — no settings to change, Vercel auto-detects everything
5. Done! You get a URL like `https://fanstream-abc123.vercel.app`

### Step 3 — Open and watch
Visit your Vercel URL in any browser. The channel list loads automatically.

## Change the playlist
Edit `api/playlist.js` line 3:
```js
const M3U_URL = "your-new-m3u-url-here";
```
Then commit — Vercel auto-redeploys.

## How it works
- `/api/playlist` — serverless function that fetches the M3U file and returns it to your browser
- `/api/proxy`    — serverless function that fetches any HLS segment URL and pipes it back, bypassing CORS
- The player rewrites all stream URLs to go through `/api/proxy` so the browser never touches the original servers directly
