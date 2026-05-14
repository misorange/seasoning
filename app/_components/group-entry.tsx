"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";
import {
  getMembershipClaimsFromAccessToken,
  hasMembershipClaims,
} from "@/utils/supabase/session";

type Status = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type InviteJoinFormProps = {
  inviteCode?: string;
  lockedCode?: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureAnonymousSession(supabase: SupabaseClient) {
  // proxy.ts がサーバーサイドで匿名セッションを作成済みのため、
  // 通常は getSession() でセッションが取得できる。
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return session;
  }

  // Cookie同期が間に合わなかった場合のフォールバック
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.session) {
    throw new Error(
      error?.message ?? "匿名セッションの作成に失敗しました。",
    );
  }

  return data.session;
}

async function refreshMembershipClaims(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    throw new Error(error?.message ?? "参加情報の更新に失敗しました。");
  }

  const claims = getMembershipClaimsFromAccessToken(data.session.access_token);

  if (!hasMembershipClaims(claims)) {
    throw new Error(
      "参加は完了しましたが、セッションへの反映を確認できませんでした。少し待って再試行してください。",
    );
  }

  return claims;
}

function statusClassName(tone: Status["tone"]) {
  if (tone === "success") {
    return "text-emerald-600";
  }

  if (tone === "error") {
    return "text-rose-600";
  }

  return "text-gray-500";
}

export function HomeGroupEntry() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [groupName, setGroupName] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [submitting, setSubmitting] = useState<"create" | "join" | null>(null);
  const [status, setStatus] = useState<Status>({
    tone: "neutral",
    message: "匿名セッションを準備しています。",
  });

  async function completeAndGoToGroup() {
    await refreshMembershipClaims(supabase);
    setStatus({
      tone: "success",
      message: "参加情報を更新しました。ホームへ移動します。",
    });
    
    // Cookieの書き込みが確実に完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    router.replace("/group");
    router.refresh();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedGroupName = groupName.trim();
    const trimmedNickname = createNickname.trim();

    if (!trimmedGroupName || !trimmedNickname) {
      setStatus({
        tone: "error",
        message: "グループ名とニックネームを入力してください。",
      });
      return;
    }

    setSubmitting("create");
    setStatus({
      tone: "neutral",
      message: "セッションを確認しています...",
    });

    try {
      await ensureAnonymousSession(supabase);
      
      setStatus({
        tone: "neutral",
        message: "グループを登録しています...",
      });
      const { error } = await supabase.rpc("create_group_with_member", {
        p_group_name: trimmedGroupName,
        p_nickname: trimmedNickname,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setStatus({
        tone: "neutral",
        message: "参加情報を同期しています...",
      });
      await completeAndGoToGroup();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "グループ作成に失敗しました。",
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedInviteCode = inviteCode.trim();
    const trimmedNickname = joinNickname.trim();

    if (!uuidPattern.test(trimmedInviteCode)) {
      setStatus({
        tone: "error",
        message: "招待コードはUUID形式で入力してください。",
      });
      return;
    }

    if (!trimmedNickname) {
      setStatus({
        tone: "error",
        message: "ニックネームを入力してください。",
      });
      return;
    }

    setSubmitting("join");
    setStatus({
      tone: "neutral",
      message: "セッションを確認しています...",
    });

    try {
      await ensureAnonymousSession(supabase);
      
      setStatus({
        tone: "neutral",
        message: "グループに参加しています...",
      });
      const { error } = await supabase.rpc("join_group_by_invite", {
        p_invite_code: trimmedInviteCode,
        p_nickname: trimmedNickname,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setStatus({
        tone: "neutral",
        message: "参加情報を同期しています...",
      });
      await completeAndGoToGroup();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "グループ参加に失敗しました。",
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleCreate} className="space-y-6 p-6 sm:p-8 rounded-2xl bg-gray-50/80 border border-gray-100">
        <div className="pb-4">
          <h2 className="text-xl font-medium text-gray-800 tracking-tight">
            グループ作成
          </h2>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
              グループ名
            </span>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
              maxLength={60}
              placeholder="夜更けの日記会"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
              あなたのニックネーム
            </span>
            <input
              value={createNickname}
              onChange={(event) => setCreateNickname(event.target.value)}
              className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
              maxLength={40}
              placeholder="miso"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting !== null}
          className="w-full text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors pt-2 pb-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center"
        >
          {submitting === "create" ? "作成しています..." : "グループを作成"}
        </button>
      </form>

      <form onSubmit={handleJoin} className="space-y-6 p-6 sm:p-8 rounded-2xl bg-gray-50/80 border border-gray-100">
        <div className="pb-4">
          <h2 className="text-xl font-medium text-gray-800 tracking-tight">
            グループ参加
          </h2>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
              招待コード
            </span>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              className="w-full h-10 border-b border-gray-200 bg-transparent px-0 font-mono text-sm tracking-wider text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
              あなたのニックネーム
            </span>
            <input
              value={joinNickname}
              onChange={(event) => setJoinNickname(event.target.value)}
              className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
              maxLength={40}
              placeholder="shio"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting !== null}
          className="w-full text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors pt-2 pb-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center"
        >
          {submitting === "join" ? "参加処理中..." : "招待コードで参加"}
        </button>
      </form>

      {status.message && (
        <p
          className={`text-sm font-medium lg:col-span-2 pt-4 ${statusClassName(
            status.tone,
          )}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

export function InviteJoinForm({
  inviteCode: initialInviteCode = "",
  lockedCode = false,
}: InviteJoinFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "neutral",
    message: "参加するニックネームを決めてください。",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedInviteCode = inviteCode.trim();
    const trimmedNickname = nickname.trim();

    if (!uuidPattern.test(trimmedInviteCode)) {
      setStatus({
        tone: "error",
        message: "招待コードが正しい形式ではありません。",
      });
      return;
    }

    if (!trimmedNickname) {
      setStatus({
        tone: "error",
        message: "ニックネームを入力してください。",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      tone: "neutral",
      message: "参加処理を進めています...",
    });

    try {
      await ensureAnonymousSession(supabase);
      const { error } = await supabase.rpc("join_group_by_invite", {
        p_invite_code: trimmedInviteCode,
        p_nickname: trimmedNickname,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await refreshMembershipClaims(supabase);
      setStatus({
        tone: "success",
        message: "参加情報を更新しました。ホームへ移動します。",
      });
      
      // Cookieの書き込みが確実に完了するのを待つ
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      router.replace("/group");
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "グループ参加に失敗しました。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8 rounded-2xl bg-gray-50/80 border border-gray-100">
      <div className="pb-4">
        <h1 className="text-2xl font-medium text-gray-800 tracking-tight">
          グループに参加
        </h1>
      </div>

      <div className="space-y-6">
        <label className="block">
          <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
            招待コード
          </span>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            readOnly={lockedCode}
            className="w-full h-10 border-b border-gray-200 bg-transparent px-0 font-mono tracking-wider text-sm text-gray-800 focus:outline-none focus:border-gray-800 transition-colors read-only:text-gray-500 read-only:border-transparent"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
            あなたのニックネーム
          </span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
            maxLength={40}
            placeholder="shio"
            autoFocus
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors pt-2 pb-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center mt-2"
      >
        {submitting ? "参加処理中..." : "このグループに参加"}
      </button>

      {status.message && (
        <p
          className={`text-sm font-medium pt-2 ${statusClassName(
            status.tone,
          )}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
