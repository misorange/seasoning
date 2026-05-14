"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AccountMembership } from "@/utils/account";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type GroupSelectorProps = {
  memberships: AccountMembership[];
};

export function GroupSelector({ memberships }: GroupSelectorProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(memberId: string) {
    setActivating(memberId);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("activate_my_membership", {
        p_member_id: memberId,
      });

      if (rpcError) {
        throw new Error(formatSupabaseError(rpcError));
      }

      await supabase.auth.refreshSession();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "グループの選択に失敗しました。",
      );
    } finally {
      setActivating(null);
    }
  }

  if (memberships.length === 0) {
    return (
      <div className="py-16 text-center space-y-6">
        <p className="text-base text-gray-500">
          所属しているグループがありません。
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-gray-800 hover:text-black transition-colors px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm"
          >
            グループを作成・参加
          </Link>
          <Link
            href="/account"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-4 py-2"
          >
            マイアカウント
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {memberships.map((membership) => (
          <button
            key={membership.member_id}
            type="button"
            onClick={() => handleSelect(membership.member_id)}
            disabled={activating !== null}
            className="w-full text-left p-5 rounded-2xl border border-gray-100 bg-gray-50/80 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-wait"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-800 tracking-tight">
                  {membership.group_name}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">
                    {membership.nickname}
                  </span>
                  <span className="text-xs text-gray-400 uppercase tracking-widest">
                    {membership.member_role}
                  </span>
                </div>
              </div>
              {activating === membership.member_id ? (
                <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Link
          href="/account"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          マイアカウント
        </Link>
      </div>
    </div>
  );
}
