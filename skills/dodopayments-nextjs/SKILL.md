---
name: dodopayments-nextjs
description: Integrates DodoPayments into Next.js App Router projects for one-time checkout and subscription billing, including secure server-side session creation, webhook verification, and entitlement updates. Use when the user asks for payment checkout, recurring plans, webhook handling, or billing-state synchronization.
---

# DodoPayments for Next.js (Checkout + Subscriptions)

## When to use

Use this skill when implementing or debugging DodoPayments in a Next.js App Router TypeScript project, especially for:
- One-time product checkout
- Subscription plan checkout and lifecycle handling
- Webhook processing for payment state updates
- Access/entitlement synchronization after payment events

## Default assumptions

- Framework: Next.js App Router
- Backend endpoints are implemented with route handlers
- Secrets remain server-side only
- Product/price identifiers already exist in DodoPayments

If a different stack is required, ask before implementation.

## Implementation workflow

Track work with this checklist:

```text
DodoPayments Integration Progress
- [ ] Add environment variables and secret boundaries
- [ ] Create server route to initialize checkout/session
- [ ] Implement one-time checkout flow
- [ ] Implement subscription checkout flow
- [ ] Add webhook endpoint with signature verification
- [ ] Map billing events to local entitlement updates
- [ ] Validate checkout and webhook behavior end-to-end
```

## Step 1: Environment and security

Typical variables:
- `DODOPAYMENTS_API_KEY` (server only)
- `DODOPAYMENTS_WEBHOOK_SECRET` (server only)
- `NEXT_PUBLIC_APP_URL` (or equivalent app base URL)

Never expose payment secret keys to client components.

## Step 2: Checkout session creation endpoint

Create a server route handler for checkout creation:
1. Validate request payload (product/plan, customer identifier, success/cancel URLs)
2. Call DodoPayments API from server
3. Return checkout URL/session identifier to client

Keep business rules server-side (allowed plan IDs, price validation).

## Step 3: One-time purchase flow

Client flow:
1. User clicks buy button
2. Client calls checkout-init route
3. Client redirects to returned hosted checkout URL
4. Post-checkout return page polls/queries payment state if needed

## Step 4: Subscription flow

For recurring plans:
- Use subscription-specific price/plan IDs
- Prevent duplicate active subscriptions when business rules require single-plan ownership
- Handle upgrade/downgrade/cancel via billing portal or server endpoints (project dependent)

## Step 5: Webhook handling

Implement webhook route that:
1. Reads raw request body
2. Verifies webhook signature with secret
3. Parses event type and payload
4. Applies idempotent state updates
5. Returns 2xx quickly after persistence

Do not perform long-running work synchronously inside webhook response path.

## Step 6: Entitlement sync strategy

Maintain a billing table keyed by user/customer:
- External customer ID
- Subscription/payment status
- Current plan
- Renewal/expiration timestamps
- Last processed webhook event ID

Gate paid features using your local billing state, not client-side payment assumptions.

## Step 7: Verification

Minimum checks:
- One-time checkout success updates entitlement
- One-time failed/canceled checkout does not unlock access
- Subscription creation grants access
- Renewal failure or cancel updates entitlement correctly
- Duplicate webhook deliveries remain idempotent

## Troubleshooting

- Signature verification failures: verify raw body handling and webhook secret
- Checkout created but entitlement unchanged: inspect webhook delivery and event mapping
- Users lose access unexpectedly: verify subscription status mapping and grace-period rules

## Additional resources

- Detailed endpoint patterns, event mapping guidance, and data model suggestions: [reference.md](reference.md)
