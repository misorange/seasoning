import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const sessionResult = await supabase.auth.getSession();
  const groupPingResult = await supabase
    .from("groups")
    .select("id", { head: true })
    .limit(1);

  const sessionOk = !sessionResult.error;
  const groupOk = !groupPingResult.error;

  if (!sessionOk && !groupOk) {
    const errors = [
      sessionResult.error ? sessionResult.error.message : null,
      groupPingResult.error ? groupPingResult.error.message : null,
    ].filter(Boolean);

    return new Response(JSON.stringify({
      success: false,
      message: "Supabase keepalive ping failed.",
      errors,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Supabase keepalive ping succeeded.",
    session: sessionOk,
    groupsQuery: groupOk,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
