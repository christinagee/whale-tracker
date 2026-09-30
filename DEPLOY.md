# Deploy to Vercel (Step-by-Step)

This guide will take you from zero to a live website in ~5 minutes. No scary stuff, I promise.

## Prerequisites

- GitHub account (free at github.com)
- Vercel account (free at vercel.com)
- Node.js installed locally (for testing before deploying)

## Step 1: Prepare Your Local Project

```bash
# 1. Navigate to your whale-tracker directory
cd whale-tracker

# 2. Install dependencies
npm install

# 3. Test locally (optional but recommended)
npm run dev
# Visit http://localhost:5173 to see it working
# Press Ctrl+C to stop
```

## Step 2: Create GitHub Repository

### On GitHub.com:
1. Click **+** (top right) → **New repository**
2. Name it `whale-tracker`
3. Click **Create repository** (don't initialize with anything)
4. Copy the commands it shows you

### In your terminal (in whale-tracker folder):

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial whale tracker commit"

# Rename main branch (if needed)
git branch -M main

# Add remote (paste the URL from GitHub step above)
git remote add origin https://github.com/YOUR_USERNAME/whale-tracker.git

# Push to GitHub
git push -u origin main
```

**Done!** Your code is now on GitHub.

## Step 3: Connect to Vercel (The Easy Part)

### On Vercel.com:
1. Sign up / Log in
2. Click **Add New...** → **Project**
3. Click **Import Git Repository**
4. Paste your GitHub repo URL: `https://github.com/YOUR_USERNAME/whale-tracker`
5. Click **Import**
6. Vercel auto-detects it's a Vite+React project
7. Click **Deploy**

**That's it!** 🎉

Your site will be live at:
```
https://whale-tracker-abc123.vercel.app
```

(The exact URL appears in Vercel dashboard)

## Step 4: Set Environment Variables (Optional)

The Acartia API is public, so it works without env vars. But to be safe:

1. In Vercel dashboard → Your project
2. Go to **Settings** → **Environment Variables**
3. Add these:
   ```
   VITE_ACARTIA_API_URL = https://acartia.io/api/v1
   VITE_MAPLIBRE_STYLE_URL = https://tiles.openfreemap.org/styles/liberty
   ```
4. Save

## Step 5: Auto-Deploy on Push (Bonus)

Now whenever you update code and push to GitHub, Vercel automatically redeploys:

```bash
# Make a change to a file
# Then:
git add .
git commit -m "Updated whale tracker"
git push

# Vercel automatically deploys the new version!
# Check https://vercel.com/dashboard/projects to see progress
```

## Step 6: Custom Domain (Optional)

Want `whales.app` instead of `whale-tracker-abc123.vercel.app`?

1. Buy a domain (namecheap.com, GoDaddy, etc.)
2. In Vercel → Settings → Domains
3. Add your domain
4. Follow DNS instructions
5. Done in ~10 minutes

## Troubleshooting

### "Build failed"
- Check the Vercel build logs (click on the failed deployment)
- Usually missing dependencies → run `npm install` locally and try again
- Push to GitHub again

### "Blank page / 404"
- Make sure `index.html` exists in root folder
- Make sure `vite.config.ts` points to `src/main.tsx`
- Rebuild locally: `npm run build`

### "API not working"
- Check browser console (F12 → Console)
- Verify Acartia API is up: https://acartia.io
- Test in your browser: `curl https://acartia.io/api/v1/sightings/current`

## Project Structure (What You Should Have)

```
whale-tracker/
├── src/
│   ├── api/
│   │   └── acartia.ts
│   ├── components/
│   │   ├── Map.tsx
│   │   ├── SightingsList.tsx
│   │   └── SightingDetail.tsx
│   ├── hooks/
│   │   └── useSightings.ts
│   ├── styles/
│   │   ├── Map.css
│   │   ├── SightingsList.css
│   │   ├── SightingDetail.css
│   │   └── App.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## That's It!

Your whale tracker is now live on the internet. You can:
- Share the link with anyone
- Show real whale data from Acartia
- Update it anytime by pushing to GitHub
- Add a custom domain later

## Next Steps

1. **Test it** — Visit your Vercel URL and click some whale markers
2. **Share it** — Send the link to friends
3. **Monitor** — Watch real sightings come in
4. **Improve** — When ready, add features (mobile app, notifications, etc.)

---

**Questions?** Check Vercel docs: https://vercel.com/docs
