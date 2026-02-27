---
name: supabase-auth-nextjs
description: Implements Supabase authentication in Next.js App Router projects using email/password and OAuth providers, with secure server-side session handling, middleware protection, and callback flows. Use when the user asks to add login/signup, social login, auth guards, session persistence, or Supabase auth troubleshooting.
---

# Supabase Auth for Next.js (Email + OAuth)

## When to use

Use this skill when building or fixing Supabase auth in a Next.js App Router TypeScript codebase, specifically:
- Email/password sign up and sign in
- OAuth sign in (Google/GitHub/etc.)
- Auth callback and session persistence
- Route protection for app pages and APIs

## Default assumptions

- Framework: Next.js App Router
- Runtime: Node.js
- Supabase project already exists
- Auth providers are configured in Supabase dashboard

If assumptions differ, ask for confirmation before editing files.

## Implementation workflow

Copy this checklist and keep it updated:

```text
Supabase Auth Progress
- [ ] Add required environment variables
- [ ] Install and configure Supabase SSR client utilities
- [ ] Implement email/password actions
- [ ] Implement OAuth sign-in flow and callback route
- [ ] Add auth-aware middleware for protected routes
- [ ] Build login/signup UI wiring
- [ ] Validate end-to-end auth behavior
```

## Step 1: Environment variables

Require these variables in local env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose service role keys to client components.

## Step 2: Shared auth client utilities

Create small helpers for:
- Browser client (client components)
- Server client (server components/route handlers/actions)
- Middleware client (request-time session refresh)

Use `@supabase/ssr` with `@supabase/supabase-js`.

## Step 3: Email/password auth actions

Implement server actions (or route handlers) for:
- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`

Return typed success/error results and user-friendly error messages.

## Step 4: OAuth flow + callback

Use `signInWithOAuth` from a client or server action and pass a callback URL (for example `/auth/callback`).

In callback handler:
1. Read auth code from query params
2. Exchange code for session
3. Redirect to intended destination (fallback to app home)

## Step 5: Route protection

Use middleware to protect private routes and redirect unauthenticated users to sign-in.

Apply a matcher that avoids static assets and public routes.

## Step 6: UI and UX

Login/signup screens should include:
- Email/password form
- OAuth buttons
- Loading and error states
- Post-login redirect handling

## Step 7: Verification

Minimum checks:
- Email signup creates user and starts session (or confirms email, depending on project settings)
- Email login succeeds with valid credentials
- OAuth login returns to app with active session
- Protected routes reject unauthenticated access
- Sign out clears session and blocks protected pages

## Troubleshooting

- `invalid redirect URL`: verify provider redirect settings in Supabase dashboard
- Session not persisting: verify cookie handling in middleware/client setup
- OAuth succeeds but user is logged out: verify callback route exchanges auth code

## Additional resources

- Detailed implementation patterns and file examples: [reference.md](reference.md)
