# Firebase / Google Cloud Setup Guide — PermitPro PMS

Step-by-step to stand up the hosting half of the migration. The **database is already
done** (Supabase Postgres) — this guide covers compute (Firebase App Hosting) and document
file storage (Cloud Storage). Follow the parts in order.

> **Where to run commands:** any machine that has this repo checked out. The Raspberry Pi
> works, but its preinstalled `firebase` binary is x86 and broken on ARM — Part A fixes that.
> A Firebase **project is also a Google Cloud project**, so the `firebase` and `gcloud`
> CLIs operate on the same thing.

**End state / what each env var becomes:**

| Setting | Where it lives | Value |
|---|---|---|
| `DATABASE_URL` | App Hosting **secret** | Supabase pooler URL (already in `.env.local`) |
| `NEXTAUTH_SECRET` | App Hosting **secret** | generated in Part E1 |
| `NEXTAUTH_URL` | `apphosting.yaml` env | your backend's public URL (Part D) |
| `STORAGE_DRIVER` | `apphosting.yaml` env | `gcs` (already set) |
| `GCS_BUCKET` | `apphosting.yaml` env | the bucket you create in Part C |
| `CRON_SECRET` | App Hosting **secret** | generated in Part I (daily snapshot job) |

**This project's actual values** (substitute for the placeholders below):

| Placeholder | Value |
|---|---|
| `PROJECT_ID` | `permitpro-pms-e596b` |
| `BUCKET` | `permit_storage-1` |
| `REGION` | `us-east4` (App Hosting backend region; near the Supabase `us-east-1` DB) |
| App Hosting repo / branch | `naciremadream81/permitpro-pms` / `master` |
| `NEXTAUTH_URL` | `https://permitpro-pms--permitpro-pms-e596b.us-east4.hosted.app` |

---

## Part A — Fix/Install the CLIs

```bash
# 1. Firebase CLI (the existing /usr/local/bin/firebase is x86 — "exec format error" on the Pi)
npm i -g firebase-tools
firebase --version          # confirm it runs on this host

# 2. Google Cloud CLI (used for the bucket + IAM). On Debian/Raspberry Pi OS:
#    https://cloud.google.com/sdk/docs/install  (use the ARM64 / apt path)
gcloud --version

# 3. Log in (headless Pi: add --no-localhost and paste the code)
firebase login            # or: firebase login --no-localhost
gcloud auth login
```

---

## Part B — Create the Firebase project + enable billing

You can do this in the console (https://console.firebase.google.com) or CLI. **Blaze
(pay-as-you-go) is required** — App Hosting has no free-plan path. Expected cost for this
internal tool is **$0–$2/month**; a budget alert makes overruns impossible.

The project already exists as **`permitpro-pms-e596b`** — just select it:

```bash
firebase use permitpro-pms-e596b
gcloud config set project permitpro-pms-e596b
```

Then in the console:
1. **Upgrade to Blaze:** ⚙ → Usage and billing → Modify plan → Blaze (link a billing account).
2. **Budget alert:** Google Cloud Console → Billing → Budgets & alerts → Create budget →
   scope to this project, amount **$5**, alert thresholds at 50/90/100%.

---

## Part C — Create the Cloud Storage bucket

This is where permit documents live (the `gcs` storage driver writes here).

```bash
gcloud config set project PROJECT_ID
gcloud services enable storage.googleapis.com

# Dedicated bucket for permit docs. Name must be globally unique.
gcloud storage buckets create gs://BUCKET \
  --location=REGION \
  --uniform-bucket-level-access
```

> `BUCKET` (the bare name, no `gs://`) is what goes in `GCS_BUCKET` later. Keep the bucket
> **private** — documents are served only through the app's authenticated download route.

---

## Part D — Create the App Hosting backend (connects GitHub)

App Hosting builds from a GitHub branch. The app — including all the migration/checklist/
storage work — is already pushed to **`master`** on this repo, so no merge step is needed.

In the Firebase console (easiest for the GitHub OAuth step):
1. **Build → App Hosting → Get started.**
2. Authorize GitHub and select the repo **`naciremadream81/permitpro-pms`**.
3. **Live branch:** `master` (enable automatic rollouts on push). Note: this repo's `main`
   branch holds unrelated history — `master` is the source of truth for the deployed app.
4. **Region:** `us-east1`. Root directory: `/`. Finish — it kicks off the first rollout.

CLI equivalent:
```bash
firebase apphosting:backends:create --project PROJECT_ID
```

When the backend is created, note its **public URL** (shown in the console, e.g.
`https://<backend>--PROJECT_ID.REGION.hosted.app`). That URL is your `NEXTAUTH_URL`.

---

## Part E — Configure the app (secrets + `apphosting.yaml`)

### E1. Generate the NextAuth secret
```bash
openssl rand -base64 32      # copy the output for the next step
```

### E2. Store the two secrets and grant the backend access
`apphosting.yaml` already references these by name (`secret: NEXTAUTH_SECRET`, `secret:
DATABASE_URL`). The CLI prompts for the value, stores it in Secret Manager, and offers to
grant your backend access — say **yes**.

```bash
firebase apphosting:secrets:set NEXTAUTH_SECRET --project PROJECT_ID
# paste the openssl output

firebase apphosting:secrets:set DATABASE_URL --project PROJECT_ID
# paste the Supabase pooler URL from .env.local (the postgresql://...pooler.supabase.com line,
# password included). Do NOT use the IPv6-only db.*.supabase.co host — Cloud Run needs the pooler.

# If you skipped the grant prompt, run it explicitly:
firebase apphosting:secrets:grantaccess NEXTAUTH_SECRET --backend BACKEND_ID --project PROJECT_ID
firebase apphosting:secrets:grantaccess DATABASE_URL   --backend BACKEND_ID --project PROJECT_ID
```

### E3. Fill the placeholders in `apphosting.yaml`
Edit the repo file and commit:
- `NEXTAUTH_URL` → the backend URL from Part D.
- `GCS_BUCKET` → your bucket name from Part C (bare name, no `gs://`).
- `STORAGE_DRIVER` is already `gcs` — leave it.

### E4. Give the runtime service account access to the bucket (this is the GCS driver's ADC)
The storage driver authenticates with Application Default Credentials — i.e. the backend's
runtime service account. Find it in the console (App Hosting → your backend → Settings;
it looks like `firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com`), then:

```bash
gcloud storage buckets add-iam-policy-binding gs://BUCKET \
  --member="serviceAccount:firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

## Part F — Migrate existing document files into the bucket

DB `storagePath` values are relative keys (`permits/{id}/{file}`), which map 1:1 to GCS
object keys — so mirror the local `storage/permits/` tree into the bucket under the same
prefix. Run from the repo root (where the `storage/` dir is):

```bash
gcloud storage rsync -r storage/permits gs://BUCKET/permits
# verify a few keys exist as permits/<permitId>/<file>:
gcloud storage ls -r gs://BUCKET/permits | head
```

> The seed/demo permits reference files that were never copied off the old Docker host, so
> those will be absent — only real uploaded documents matter here.

---

## Part G — Deploy & verify

A push to the live branch auto-deploys; otherwise trigger a rollout from the console (App
Hosting → Create rollout) or:
```bash
firebase apphosting:rollouts:create BACKEND_ID --project PROJECT_ID
```

Smoke-test the deployed URL:
- [ ] **Log in** (use the production admin credentials — the DB carries production users, not the dev `admin123`).
- [ ] Dashboard / board / registers render with real data (67 counties etc.).
- [ ] Open a permit → assign a county → checklist generates.
- [ ] **Upload a document, then download it** — this is the end-to-end test of the GCS driver (couldn't be verified locally).
- [ ] Property appraiser lookup works.

---

## Part H — Cutover & cost check

1. **Custom domain (optional):** App Hosting → Add custom domain; follow the DNS records.
   If you change the domain, update `NEXTAUTH_URL` in `apphosting.yaml` and redeploy, or
   NextAuth callbacks/redirects will break.
2. **Retire the old stack:** once the deployed app is verified, stop the Cloudflare tunnel
   and the Pi Docker container, and repoint DNS.
3. **Confirm cost:** check Billing → Reports after a day; verify the $5 budget alert is active.

---

## Part I — Daily snapshot cron (trend analytics)

The app captures a daily `PackageSnapshot` for the trend/analytics charts via
`POST /api/cron/snapshot`, guarded by `CRON_SECRET`. Without this it stays disabled (the
endpoint returns 503) and trend history won't accrue. Set it up with a secret + a Cloud
Scheduler job that calls the endpoint daily.

```bash
# 1. Generate and store the shared secret (apphosting.yaml already references CRON_SECRET)
openssl rand -hex 32                       # copy the output
firebase apphosting:secrets:set CRON_SECRET --project PROJECT_ID   # paste it; grant the backend access

# 2. Schedule a daily POST with the secret as a bearer token
gcloud services enable cloudscheduler.googleapis.com
gcloud scheduler jobs create http permitpro-daily-snapshot \
  --location=REGION \
  --schedule="0 6 * * *" \
  --time-zone="America/New_York" \
  --uri="https://YOUR-APP-HOSTING-DOMAIN/api/cron/snapshot" \
  --http-method=POST \
  --headers="Authorization=Bearer THE-CRON-SECRET"
```

> Use the same value for the scheduler header and the `CRON_SECRET` secret. Re-run after the
> backend URL is known (Part D). Verify with: `gcloud scheduler jobs run permitpro-daily-snapshot
> --location=REGION` then check the App Hosting logs for "Daily snapshot complete".

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails: `npm ci` lockfile mismatch | `package.json` and `package-lock.json` must be in sync. Both are committed; if you add deps, run `npm install --package-lock-only`. |
| `firebase: exec format error` on the Pi | The global binary is x86. `npm i -g firebase-tools` (Part A). |
| App can't reach the database | Use the **session pooler** host (`aws-1-...pooler.supabase.com`), not `db.*.supabase.co` (IPv6-only). Confirm the `DATABASE_URL` secret. |
| Document upload/download → 403 from storage | Runtime service account lacks bucket access — redo Part E4. |
| Document download → "Failed to download" / 404 for old files | Objects not migrated — rerun Part F and confirm keys are `permits/{id}/{file}`. |
| Login redirect loop / callback errors | `NEXTAUTH_URL` doesn't match the actual public URL. Fix in `apphosting.yaml`, redeploy. |
| Build can't resolve `@google-cloud/storage` | Should be handled (externalized in `next.config.mjs`, listed in `package.json`). Ensure both are committed on the deploy branch. |

> **Later (optional roadmap):** move to 100% Firebase — Firestore + Firebase Auth. That's a
> large rewrite of the data layer and is independent of this hosting setup.
