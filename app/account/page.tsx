"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountPanel } from "../_components/account-panel";
import type {
  AccountMembership,
  ReceivedDiaryHistoryItem,
  SentDiaryHistoryItem,
} from "@/utils/account";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";
import { getMembershipClaimsFromAccessToken } from "@/utils/supabase/session";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [sentHistory, setSentHistory] = useState<SentDiaryHistoryItem[]>([]);
  const [receivedHistory, setReceivedHistory] = useState<ReceivedDiaryHistoryItem[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | undefined>();

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/");
          return;
        }

        const claims = getMembershipClaimsFromAccessToken(session.access_token);
        setCurrentMemberId(claims.memberId);

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

        if (firstError) {
          setError(formatSupabaseError(firstError));
        } else {
          setMemberships(membershipsResult.data ?? []);
          setSentHistory(sentHistoryResult.data ?? []);
          setReceivedHistory(receivedHistoryResult.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">読み込み中...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
          <div className="text-center py-16">
            <p className="text-sm text-rose-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-gray-600 hover:text-gray-800 underline"
            >
              再読み込み
            </button>
          </div>
        </div>
      </main>
    );
  }

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
          <AccountPanel
            currentMemberId={currentMemberId}
            memberships={memberships}
            sentHistory={sentHistory}
            receivedHistory={receivedHistory}
          />
        </div>
      </div>
    </main>
  );
}
