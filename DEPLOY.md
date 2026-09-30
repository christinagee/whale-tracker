# Deploy to Vercel

You can do all of this in a web browser. Nothing needs to be installed.

## 1. Import the project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New… → Project**.
3. Find `whale-tracker` and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to the repo.
4. Vercel detects **Vite**. Leave the settings as they are and click **Deploy**.

After about a minute you get a link like `https://whale-tracker-xxxx.vercel.app`.

## 2. Check that live sightings are showing

No setup is needed. Acartia's "current sightings" feed (the last 7 days) is open to everyone, so the deployed site loads real data on its own.

- Open your Vercel link. The badge in the top-right corner should read **Live · updated just now**.
- If it says **Sample data**, see Troubleshooting below.

### Optional: add an Acartia token

The site works without one. A token only helps if Acartia starts requiring one later or you want to use its registered-user features.

1. Click **Register** at [acartia.io](https://acartia.io) and fill in the form. An administrator reviews new accounts, so approval can take a while.
2. Once approved, log in. Under **Your Active Tokens** there is a token named **Default**. Copy it.
3. In Vercel open your project → **Settings → Environment Variables**. Add a variable named `ACARTIA_TOKEN`, paste the token as the value, and tick Production and Preview.
4. Go to **Deployments**, open the ⋯ menu on the latest deployment, and click **Redeploy**.

## 3. Preview changes before they go live

- A push to **`main`** updates the real site.
- A push to **any other branch** creates a separate **preview link**. Find it under the project's **Deployments** tab. The link is also posted on the GitHub pull request if there is one.

That makes it safe to try changes on a branch, check the preview on your phone, and merge to `main` only when you're happy.

## Custom domain (optional)

Vercel → Project → **Settings → Domains** → add a domain you own and follow the DNS instructions.

## Troubleshooting

- **Build failed**: open the failed deployment in Vercel and read the build log.
- **Says "Sample data" on the deployed site**: visit `your-site.vercel.app/api/sightings`. A long list of sightings means the data is fine; reload the main page. An error message there says what Acartia returned. If Acartia is down, the site automatically switches back to live data once it recovers. If the error is 401 or 403, add a token (see the optional step above).
- **Map is blank**: the map style server may be down. Set `VITE_MAP_STYLE_URL` to a different MapLibre style URL and redeploy.
