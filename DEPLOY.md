# Putting Stugbyn online with accounts

About 20 minutes, done once. You’ll create two free accounts: **Supabase** (login and saved progress, hosted in the EU) and a **static host** for the app itself. The app works without step 1–2 too; it then saves progress on the device only.

## 1. Supabase project (login + progress, EU)

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
   - **Region:** choose **North EU (Stockholm)** or **Central EU (Frankfurt)**. Your email and progress are stored there.
   - Save the database password somewhere safe (the app never needs it).
2. When the project is ready, open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `progress` table, the rules that let each person see only their own row, and the “Delete account” function.
3. **Authentication → URL Configuration**
   - **Site URL:** your app’s address, e.g. `https://stugbyn.example.eu` (you get it in step 2; come back and fill it in).
   - **Redirect URLs:** add your app’s address followed by `/**`, and `http://localhost:5173/**` for local testing.
4. **Optional, needs custom SMTP — Authentication → Emails (templates).** Supabase only lets you edit templates once your own SMTP is connected. Without it, the iPhone app signs in by pasting the link (press and hold the link in the email → Copy Link → paste in Settings → Account). Open **Magic Link** and **Confirm signup**, and add the code to each so you can sign in on a phone by typing it (handy when the email opens in another browser than the installed app):

   ```html
   <h2>Sign in to Stugbyn</h2>
   <p><a href="{{ .ConfirmationURL }}">Tap here to sign in</a></p>
   <p>Or type this code in the app: <strong>{{ .Token }}</strong></p>
   ```

5. **Project Settings → API** (in newer dashboards: **API Keys**): copy the **Project URL** and the **anon / publishable key**. Both are safe to put in the app; the database rules from step 2 protect the data. Never use the `service_role` / secret key in the app.

**Email sending limits.** Supabase’s built-in email service is only meant for testing: it has a low hourly limit and may only deliver to the email addresses of your Supabase team members. For just you, sign up to Supabase with the same email you’ll use in the app. To let other people sign in, add your own SMTP provider under **Authentication → Emails → SMTP settings** (there are EU-based ones).

**Optional:** after creating your own account, turn off **Allow new users to sign up** (Authentication → Sign In / Providers) so nobody else can create accounts on your project.

## 2. Host the app

The app is a static site: `npm run build` produces the `dist/` folder. Any static host works. It needs the code in a git repository (e.g. a private GitHub repo).

Settings for any host:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output / publish directory | `dist` |
| Node version | 20 or newer (22 recommended) |
| Environment variables | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.5 |

Options:

- **[statichost.eu](https://statichost.eu/)** — European company and infrastructure (their claim); deploys from git. Connect the repo and use the settings above. Check in their docs how to set build-time environment variables.
- **Vercel** or **Netlify** — US companies with a global CDN; the easiest setup (import the repo, pick “Vite”, add the two variables). They only serve the app’s code; no personal data passes through them.

After the first deploy, put the app’s address into Supabase (step 1.3), then open the app → **Settings → Account**, enter your email and sign in. On your phone, open the address and use “Add to Home Screen” to install it.

## Local development with accounts

```bash
cp .env.example .env.local
```

Fill in the two values, then `npm run dev`. Without `.env.local` the app runs with on-device progress only.

## How saving works

- Every answer is saved on the device first, so the app keeps working offline.
- When signed in, changes are sent to your account a few seconds later, when you leave the app, and when the connection comes back.
- Signing in on another device merges both: for each item the most recent answer wins; XP, streak and boss wins are combined; settings follow whichever device changed them last.
- **Settings → Delete account** removes the account and its saved progress. Progress on the device stays until you reset it.
