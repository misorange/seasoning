export function getSupabaseConfig() {
  const supabaseUrl = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function normalizeSupabaseUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  const url = new URL(value);

  if (
    url.pathname === "/rest/v1" ||
    url.pathname === "/rest/v1/" ||
    url.pathname === "/auth/v1" ||
    url.pathname === "/auth/v1/" ||
    url.pathname === "/realtime/v1" ||
    url.pathname === "/realtime/v1/"
  ) {
    url.pathname = "";
  }

  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}
