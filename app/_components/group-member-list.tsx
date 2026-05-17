"use client";

import { useState } from "react";

type MemberProfile = {
  id: string;
  nickname: string;
  role: "admin" | "member";
};

type GroupMemberListProps = {
  currentMemberId: string;
  groupMembers: MemberProfile[];
};

export function GroupMemberList({ currentMemberId, groupMembers }: GroupMemberListProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mb-8 rounded-3xl border border-gray-100 bg-gray-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
            メンバー
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {groupMembers.length} 人が所属しています。
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
          {groupMembers.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
              所属メンバーがまだいません。
            </p>
          ) : (
            groupMembers.map((groupMember) => (
              <div
                key={groupMember.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {groupMember.nickname}
                  </p>
                  <p className="text-xs text-gray-500">
                    {groupMember.id === currentMemberId ? "あなた" : "メンバー"}
                  </p>
                </div>
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
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
