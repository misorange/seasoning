"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type MemberProfile = {
  id: string;
  nickname: string;
  role: "admin" | "member";
  is_banned: boolean;
};

type GroupMemberListProps = {
  currentMemberId: string;
  currentMemberRole: "admin" | "member";
  groupMembers: MemberProfile[];
};

export function GroupMemberList({
  currentMemberId,
  currentMemberRole,
  groupMembers,
}: GroupMemberListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState(groupMembers);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  async function handleToggleBan(targetMemberId: string, isBanned: boolean) {
    setErrorMsg(null);
    setIsProcessing(targetMemberId);

    try {
      const { error } = await supabase.rpc("toggle_member_ban", {
        p_target_member_id: targetMemberId,
        p_is_banned: !isBanned,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === targetMemberId
            ? { ...member, is_banned: !isBanned }
            : member,
        ),
      );
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "操作に失敗しました。");
    } finally {
      setIsProcessing(null);
    }
  }

  return (
    <section className="mb-8 rounded-3xl border border-gray-100 bg-gray-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
            メンバー
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {members.length} 人が所属しています。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {isOpen ? "一覧を閉じる" : "メンバー一覧を表示"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {members.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
              所属メンバーがまだいません。
            </p>
          ) : (
            members.map((groupMember) => {
              const isSelf = groupMember.id === currentMemberId;
              const canManage = currentMemberRole === "admin" && !isSelf;
              const actionLabel = groupMember.is_banned ? "BAN解除" : "BAN";

              return (
                <div
                  key={groupMember.id}
                  className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {groupMember.nickname}
                      </p>
                      {groupMember.is_banned && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                          BAN中
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {isSelf ? "あなた" : groupMember.role === "admin" ? "管理者" : "メンバー"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={
                        `rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                          groupMember.role === "admin"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                        }`
                      }
                    >
                      {groupMember.role === "admin" ? "管理者" : "メンバー"}
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleToggleBan(groupMember.id, groupMember.is_banned)}
                        disabled={isProcessing === groupMember.id}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                      >
                        {isProcessing === groupMember.id ? "処理中…" : actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {errorMsg && (
            <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
