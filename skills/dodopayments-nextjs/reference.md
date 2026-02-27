# DodoPayments Next.js Reference

## Suggested file layout

```text
src/
  app/
    api/
      billing/
        checkout/route.ts
      webhooks/
        dodopayments/route.ts
    billing/
      success/page.tsx
      cancel/page.tsx
  lib/
    billing/
      dodopayments.ts
      entitlement.ts
      event-mapping.ts
```

Adapt naming to existing repository conventions.

## API integration boundaries

- Client responsibilities:
  - Start checkout by calling your server endpoint
  - Redirect user to hosted checkout URL
  - Show billing success/cancel states

- Server responsibilities:
  - Hold API key and webhook secret
  - Call DodoPayments APIs
  - Verify and process webhook events
  - Persist billing state and entitlements

## Checkout endpoint pattern

`POST /api/billing/checkout` should:
1. Authenticate user (if checkout requires login)
2. Validate requested product/plan against server allowlist
3. Build success/cancel callback URLs
4. Create checkout session via DodoPayments SDK/API
5. Return `{ checkoutUrl }`

Validation recommendations:
- Reject unknown plan IDs
- Reject client-provided prices (derive from server allowlist)
- Enforce one active subscription rule when needed

## Webhook endpoint pattern

`POST /api/webhooks/dodopayments` should:
1. Read raw request body string/bytes
2. Verify signature from headers + raw body + webhook secret
3. Parse typed event payload
4. Enforce idempotency using provider event ID
5. Update billing state in one transaction when possible
6. Return `200` quickly

If verification fails, return `400`.

## Idempotency strategy

Create table (or equivalent) to track processed events:
- `provider`: `dodopayments`
- `event_id`: unique
- `event_type`
- `processed_at`

Processing algorithm:
1. Begin transaction
2. Insert event ID with unique constraint
3. If duplicate-key conflict, treat as already processed and return success
4. Apply billing/entitlement updates
5. Commit transaction

## Event-to-state mapping guidance

Map provider events to internal billing status:
- Checkout completed -> paid one-time entitlement
- Subscription activated -> active subscription entitlement
- Subscription renewed -> extend entitlement
- Subscription canceled/expired -> deactivate on effective end date
- Payment failed -> mark past_due/unpaid and apply policy

Keep one canonical internal enum for billing state and map provider events into it.

## Entitlement model suggestions

Minimum fields per user/customer:
- `user_id`
- `provider_customer_id`
- `plan_code`
- `billing_status` (internal enum)
- `access_expires_at`
- `updated_at`

Feature gating rule:
- Grant premium access only when `billing_status` is active (or within an explicit grace period).

## Callback pages

Success page:
- Show optimistic success UI
- Fetch latest entitlement state from server before showing unlocked features

Cancel page:
- Preserve existing entitlements
- Offer retry path

Do not rely on callback page query params as authoritative payment confirmation.

## Operational checks

- Log webhook verification failures with request correlation IDs
- Record unmatched/unknown event types for review
- Add alerting for sustained webhook failures
- Periodically reconcile local subscription state with provider data

## Testing checklist

- Local/manual:
  - One-time checkout success/cancel paths
  - Subscription start/renew/cancel lifecycle
  - Invalid signature handling
  - Duplicate webhook replay handling

- Automated (where feasible):
  - Unit tests for event mapping logic
  - Integration tests for webhook idempotency
  - Authenticated checkout endpoint validation tests
