import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getRequestBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  return token;
}

export function requireRequestSupabase(req: Request): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const token = getRequestBearerToken(req);

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function requireRequestUserId(req: Request): Promise<string> {
  const db = requireRequestSupabase(req);
  const { data, error } = await db.auth.getUser();

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  return data.user.id;
}
