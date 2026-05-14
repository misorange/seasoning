"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { AccountMembership } from "@/utils/account";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type GroupSwitcherProps = {
  currentMemberId: string;
  memberships: AccountMembership[];
};

export function GroupSwitcher({ currentMemberId, memberships }: GroupSwitcherProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSwitching = isPending || isFetching;

  async function handleSwitch(targetMemberId: string) {
    if (targetMemberId === currentMemberId) return;

    setIsFetching(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.rpc("activate_my_membership", {
        p_member_id: targetMemberId,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await supabase.auth.refreshSession();
      
      // router.refresh() の完了を検知するために startTransition でラップする
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "グループの切り替えに失敗しました。"
      );
    } finally {
      setIsFetching(false);
    }
  }

  const [isOpen, setIsOpen] = useState(false);

  // If the user only has 1 group, we don't need a select dropdown, just text
  if (memberships.length <= 1) {
    const currentGroup = memberships.find((m) => m.member_id === currentMemberId);
    return (
      <h1 className="mt-1 text-2xl font-medium leading-tight text-gray-800 tracking-tight">
        {currentGroup?.group_name ?? "グループ"}
      </h1>
    );
  }

  const currentGroup = memberships.find((m) => m.member_id === currentMemberId);

  return (
    <div className="mt-1 relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`inline-flex items-center gap-1 transition-opacity ${isSwitching ? "opacity-40 cursor-wait" : "hover:opacity-70"}`}
      >
        <span className="text-2xl font-medium leading-tight text-gray-800 tracking-tight">
          {currentGroup?.group_name ?? "グループを選択"}
        </span>
        {isSwitching ? (
          <svg className="h-5 w-5 animate-spin text-gray-500 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className={`h-5 w-5 text-gray-500 transition-transform duration-200 ml-1 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-full mt-2 w-64 z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1 animate-fade-in-up" style={{ animationDuration: '150ms' }}>
            {memberships.map((membership) => {
              const isSelected = membership.member_id === currentMemberId;
              return (
                <button
                  key={membership.member_id}
                  onClick={() => {
                    setIsOpen(false);
                    handleSwitch(membership.member_id);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                    isSelected ? "bg-gray-50 font-medium text-gray-800" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className="truncate">{membership.group_name}</span>
                  {isSelected && (
                    <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {errorMsg && <p className="mt-2 text-sm text-rose-600">{errorMsg}</p>}
    </div>
  );
}
