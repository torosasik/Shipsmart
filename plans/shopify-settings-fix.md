# Plan: Fix ShipSmart Shopify Connection Error

## Root Causes Found

### Issue 1 — Generic "Failed to update Shopify settings" error
**Files:** `packages/backend/src/controllers/shopify-settings.ts:81` and `packages/frontend/src/pages/ShopifySettingsPage.tsx:88`

The backend controller catches all errors at line 81 and returns a static string `'Failed to update Shopify settings'`. The actual Firestore or validation error is logged to the server console but never sent to the client. The frontend at line 90 tries `err.response?.data?.error` which does get the backend message, but that message is itself generic.

### Issue 2 — No format guidance on Access Token field
The placeholder at `ShopifySettingsPage.tsx:222` says `"Enter your Shopify Admin API access token"` — no indication that the expected format is `shpat_xxxxx`. There's no helper text below the field.

### Issue 3 — Unclear "Enable Shopify Integration" checkbox behavior
The checkbox at `ShopifySettingsPage.tsx:267` has no helper text. Users don't know if it must be checked before saving. The backend requires `enabled` to be a boolean but doesn't require it to be `true` — yet there's no UI indication of this.

### Issue 4 — Test Connection gives vague results
`testShopifyConnection()` in `shopify-settings.ts:147` already returns a store name on success, but the controller at line 99-102 swallows any thrown errors with a generic `'Failed to test Shopify connection'`.

### Issue 5 — Save requires webhookSecret
The controller validation at `shopify-settings.ts:62-65` hard-requires `webhookSecret` to be a non-empty string. The `saveShopifySettings()` service already handles missing webhook secret gracefully via nullish coalescing, but the controller rejects the request before it gets there.

---

## Files to Change

| File | Changes |
|------|---------|
| `packages/backend/src/controllers/shopify-settings.ts` | Forward actual error details in save and test handlers; make webhookSecret optional in validation |
| `packages/backend/src/services/shopify-settings.ts` | Include store domain in test success message; return HTTP status code on test failure |
| `packages/frontend/src/pages/ShopifySettingsPage.tsx` | Improve error extraction; update token placeholder and helper text; add checkbox helper text; add client-side validation for enabled+empty creds; improve test connection display; mark webhook secret as optional |
| `packages/frontend/src/services/api.ts` | Make webhookSecret optional in the update type signature |

---

## Detailed Changes

### 1. Backend Controller — `packages/backend/src/controllers/shopify-settings.ts`

**updateShopifySettings handler (line 42-85):**
- Remove the hard validation for `webhookSecret` (lines 62-65) — make it optional
- In the catch block (line 81-84), forward the actual error message: `error.message || 'Failed to update Shopify settings'`
- Only pass `webhookSecret` to `saveShopifySettings()` if it was provided and non-empty

**testShopifyConnectionHandler (line 91-103):**
- In the catch block (line 99-102), forward the actual error: `error.message || 'Failed to test Shopify connection'`

### 2. Backend Service — `packages/backend/src/services/shopify-settings.ts`

**testShopifyConnection (line 147-178):**
- Include `storeDomain` in the success message: `"Connected successfully to {storeDomain}"`
- On failure, include HTTP status code when available: `"401 Unauthorized — check your Admin API access token"` or `"404 Not Found — check your store domain"`

### 3. Frontend Page — `packages/frontend/src/pages/ShopifySettingsPage.tsx`

**handleSave (line 73-96):**
- Improve error extraction to show backend validation errors, network errors, etc.
- Add client-side validation: if `enabled` is true but `storeDomain` or `accessToken` is empty, show a specific validation message instead of sending the request
- Don't send `webhookSecret` if it's empty

**Access Token field (line 214-230):**
- Change placeholder to `"shpat_xxxxxxxxxxxxxxxxxxxxx"`
- Add helper text: `"Your Shopify Admin API access token. Starts with shpat_. Found in Shopify Admin → Settings → Apps → your app → API credentials."`

**Webhook Secret field (line 232-250):**
- Change label to `"Webhook Shared Secret (optional)"`
- Add helper text: `"Only needed if you want to receive real-time order webhooks. Can be configured later."`

**Enable checkbox (line 266-278):**
- Add helper text below: `"You can save credentials without enabling the integration. Enable when ready to start syncing orders."`

**handleTestConnection (line 98-114):**
- Display storeDomain in the success message for clarity
- Show HTTP status codes and their meanings on failure

### 4. Frontend API — `packages/frontend/src/services/api.ts`

**shopifySettingsApi.update (line 149):**
- Change `webhookSecret: string` to `webhookSecret?: string` in the type signature
