import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountPanel } from "../_components/account-panel";
import type {
  AccountMembership,
  ReceivedDiaryHistoryItem,
  SentDiaryHistoryItem,
} from "@/utils/account";
import { createClient } from "@/utils/supabase/server";
import { formatSupabaseError } from "@/utils/supabase/errors";
import { getMembershipClaimsFromAccessToken } from "@/utils/supabase/session";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const claims = getMembershipClaimsFromAccessToken(session.access_token);
  const [membershipsResult, sentHistoryResult, receivedHistoryResult] =
    await Promise.all([
      supabase.rpc("get_my_account_memberships", {}, { get: true }),
      supabase.rpc("get_my_sent_diary_history", {}, { get: true }),
      supabase.rpc("get_my_received_diary_history", {}, { get: true }),
    ]);

  const firstError =
    membershipsResult.error ??
    sentHistoryResult.error ??
    receivedHistoryResult.error;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
        <header className="border-b border-gray-100 pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
                Seasoning
              </p>
              <h1 className="mt-1 text-2xl font-medium leading-tight text-gray-800 tracking-tight">
                マイアカウント
              </h1>
            </div>
            <Link
              href="/group"
              className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-800 transition-colors hover:underline"
            >
              ホーム
            </Link>
          </div>
        </header>

        <div className="py-8">
          {firstError && (
            <p className="mb-8 text-sm text-rose-600">
              {formatSupabaseError(firstError)}
            </p>
          )}

          <AccountPanel
            currentMemberId={claims.memberId}
            memberships={
              (membershipsResult.data ?? []) as AccountMembership[]
            }
            sentHistory={
              (sentHistoryResult.data ?? []) as SentDiaryHistoryItem[]
            }
            receivedHistory={
              (receivedHistoryResult.data ?? []) as ReceivedDiaryHistoryItem[]
            }
          />
        </div>
      </div>
    </main>
  );
}
