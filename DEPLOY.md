# Deploy to Vercel

You can do all of this in a web browser. Nothing needs to be installed.

## 1. Import the project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New… → Project**.
3. Find `whale-tracker` and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to the repo.
4. Vercel detects **Vite**. Leave the settings as they are and click **Deploy**.

After about a minute you get a link like `https://whale-tracker-xxxx.vercel.app`.

## 2. Turn on live sightings

Until this step the site shows sample sightings, with a "Sample data" badge.

1. Create an account at [acartia.io](https://acartia.io) and generate an API token in your account settings.
2. In Vercel open your project → **Settings → Environment Variables**.
3. Add `ACARTIA_TOKEN` with your token as the value (for Production and Preview).
4. Go to **Deployments**, open the ⋯ menu on the latest one, and click **Redeploy**.

The badge in the top-right corner should now read **Live**.

## 3. Preview changes before they go live

- A push to **`main`** updates the real site.
- A push to **any other branch** creates a separate **preview link**. Find it under the project's **Deployments** tab. The link is also posted on the GitHub pull request if there is one.

That makes it safe to try changes on a branch, check the preview on your phone, and merge to `main` only when you're happy.

## Custom domain (optional)

Vercel → Project → **Settings → Domains** → add a domain you own and follow the DNS instructions.

## Troubleshooting

- **Build failed**: open the failed deployment in Vercel and read the build log.
- **Still says "Sample data"**: check that `ACARTIA_TOKEN` is set and that you redeployed afterwards. Then visit `/api/sightings` on your site. If you see an error message there, it explains what Acartia returned (for example 401 means the token is wrong).
- **Map is blank**: the map style server may be down. Set `VITE_MAP_STYLE_URL` to a different MapLibre style URL and redeploy.
