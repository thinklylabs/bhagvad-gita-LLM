# Supabase Auth Next.js Reference

## Recommended package setup

Install:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Suggested file layout

```text
src/
  lib/supabase/
    client.ts
    server.ts
    middleware.ts
  app/
    auth/
      callback/route.ts
    (auth)/
      login/page.tsx
      signup/page.tsx
  middleware.ts
```

Adjust paths to match the repository conventions.

## Utility patterns

## Browser client utility

Purpose: run auth operations in client components.

Typical API:
- `createBrowserClient(url, anonKey)`

## Server client utility

Purpose: fetch authenticated user/session in server contexts.

Typical API:
- `createServerClient(url, anonKey, { cookies })`

Ensure cookies are read/written using Next.js server helpers.

## Middleware client utility

Purpose: refresh and sync auth session on protected requests.

Typical API:
- `createServerClient(url, anonKey, { cookies })`
- call `auth.getUser()` or equivalent to force session resolution

## OAuth callback route pattern

Use a route handler at `/auth/callback`:
1. Parse `code` from request URL
2. If `code` exists, exchange it for session
3. Redirect to `next` query param when provided and safe
4. Fallback redirect to `/`

Safety rules:
- Allow only internal relative redirect paths for `next`
- Never trust full external URLs from query params

## Middleware protection pattern

Middleware should:
1. Skip public assets and auth routes as needed
2. Resolve current auth user/session
3. Redirect to login for protected paths when unauthenticated
4. Optionally redirect authenticated users away from login/signup

Matcher guidance:
- Exclude `_next/static`, `_next/image`, `favicon.ico`, and common static file extensions

## Form action behavior

For email/password:
- Validate input shape and minimum password requirements
- Call Supabase auth method
- Convert raw auth errors to stable UI messages

Example message mapping:
- Invalid credentials -> "Incorrect email or password"
- Email already in use -> "Account already exists"
- Network issue -> "Unable to reach auth service"

## Session-aware server rendering

In server components requiring auth:
1. Create server client
2. Fetch current user/session
3. Redirect or render based on auth state

Use one shared helper to avoid repeating auth gate logic across pages.

## Security checklist

- Do not place service role keys in Next.js client-exposed env vars
- Keep anon key only in `NEXT_PUBLIC_` env vars
- Restrict OAuth redirect URLs in Supabase dashboard
- Validate `next` redirect parameter in callback
- Avoid logging sensitive tokens or full auth payloads

## Testing checklist

- Manual:
  - Signup flow (with and without email confirmation enabled)
  - Login failure and success
  - OAuth provider success path
  - OAuth cancel/deny path
  - Logout path
  - Protected route redirect

- Optional automated coverage:
  - Unit test auth action result mapping
  - Integration test callback redirect behavior
  - Middleware test for protected/public route behavior
