# Step-by-Step Guide: Enable Billing on Google Cloud

## Current Status

Your project's billing status:
```
billingEnabled: false
billingAccountName: '' (empty - no billing account linked)
```

This means billing is NOT enabled yet on your project. Follow the steps below.

---

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com**
2. Sign in with: **torosasik@americantiledepot.com**
3. Make sure project **shipsmart-app-dev** is selected at the top

---

## Step 2: Enable Billing on Your Project

### Option A: If you have an existing Google Cloud billing account:
1. Go to: **https://console.cloud.google.com/billing**
2. Click **"Link a billing account"**
3. Select your billing account
4. Click **"Set account"**

### Option B: If you need to create a new billing account:
1. Go to: **https://console.cloud.google.com/billing/create**
2. Fill in:
   - **Account name:** ShipSmart Billing
   - **Country:** United States
   - **Payment method:** Credit card (required for verification)
3. Click **"Submit and start my free trial"**

> **Important:** Google requires a credit card for identity verification. You won't be charged unless you exceed the free tier limits.

---

## Step 3: Link Billing to Your Project

1. Go to **https://console.cloud.google.com/billing/linked**
2. Find project **shipsmart-app-dev**
3. Click the **dropdown** next to it
4. Select your billing account
5. Click **"Link billing"**

---

## Step 4: Verify It's Working

Run this in your terminal:

```bash
gcloud billing projects describe shipsmart-app-dev
```

You should see:
```
billingEnabled: true
billingAccountName: billingAccounts/XXXXXXXXXX
```

If you still see `billingEnabled: false`, wait 1-2 minutes and check again.

---

## Step 5: Deploy to Cloud Run

Once billing shows as enabled, run:

```bash
# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project shipsmart-app-dev

# Deploy backend
cd packages/backend
gcloud run deploy shipsmart-api --source . --region us-central1 --platform managed --allow-unauthenticated
```

---

## Troubleshooting

### "No billing account found"
→ You need to create a billing account first (Option B in Step 2)

### "API not enabled" error
→ Wait 2 minutes after enabling billing, then retry

### Still not working
→ Make sure you're linking billing to the correct project: **shipsmart-app-dev**