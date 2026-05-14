"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AccountMembership,
  ReceivedDiaryHistoryItem,
  SentDiaryHistoryItem,
} from "@/utils/account";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type AccountPanelProps = {
  currentMemberId?: string;
  memberships: AccountMembership[];
  sentHistory: SentDiaryHistoryItem[];
  receivedHistory: ReceivedDiaryHistoryItem[];
};

type Notice = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type HistoryTab = "sent" | "received";

type IconOption = {
  id: "salt" | "soy_sauce" | "pepper" | "olive_oil" | "miso" | "herb" | "chili_pepper";
  label: string;
  src: string;
};

const iconOptions: IconOption[] = [
  { id: "salt", label: "塩", src: "/salt.png" },
  { id: "soy_sauce", label: "醤油", src: "/soy_sauce.png" },
  { id: "pepper", label: "胡椒", src: "/pepper.png" },
  { id: "olive_oil", label: "オリーブオイル", src: "/olive_oil.png" },
  { id: "miso", label: "味噌", src: "/miso.png" },
  { id: "herb", label: "ハーブ", src: "/herb.png" },
  { id: "chili_pepper", label: "唐辛子", src: "/chili_pepper.png" },
];

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noticeClassName(tone: Notice["tone"]) {
  if (tone === "success") {
    return "text-emerald-600";
  }

  if (tone === "error") {
    return "text-rose-600";
  }

  return "text-gray-500";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function AccountPanel({
  currentMemberId,
  memberships,
  sentHistory,
  receivedHistory,
}: AccountPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<any>(null);
  const [notice, setNotice] = useState<Notice>({
    tone: "neutral",
    message: "",
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [iconDraft, setIconDraft] = useState<IconOption["id"]>("salt");
  const [createGroupName, setCreateGroupName] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [historyTab, setHistoryTab] = useState<HistoryTab>("sent");
  const totalPendingTickets = memberships.reduce(
    (sum, membership) => sum + membership.pending_ticket_count,
    0,
  );

  // セッション情報を取得
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  function normalizeIconId(icon: AccountMembership["member_icon"] | undefined) {
    if (icon === "harb") {
      return "herb" as const;
    }
    return icon ?? "salt";
  }

  function beginEdit(membership: AccountMembership) {
    setEditingMemberId(membership.member_id);
    setNicknameDraft(membership.nickname);
    setIconDraft(normalizeIconId(membership.member_icon));
  }

  async function saveNickname(memberId: string) {
    const trimmedNickname = nicknameDraft.trim();

    if (!trimmedNickname) {
      setNotice({
        tone: "error",
        message: "ニックネームを入力してください。",
      });
      return;
    }

    if (!iconOptions.some((option) => option.id === iconDraft)) {
      setNotice({
        tone: "error",
        message: "有効なアイコンを選択してください。",
      });
      return;
    }

    setBusyAction(`nickname:${memberId}`);
    setNotice({
      tone: "neutral",
      message: "プロフィールを更新しています...",
    });

    try {
      const { error } = await supabase.rpc("update_my_membership_profile", {
        p_member_id: memberId,
        p_nickname: trimmedNickname,
        p_member_icon: iconDraft,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setEditingMemberId(null);
      setNotice({
        tone: "success",
        message: "プロフィールを更新しました。",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "プロフィール更新に失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function openDashboard(memberId: string) {
    setBusyAction(`activate:${memberId}`);
    setNotice({
      tone: "neutral",
      message: "グループを切り替えています...",
    });

    try {
      const { error } = await supabase.rpc("activate_my_membership", {
        p_member_id: memberId,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await supabase.auth.refreshSession();
      router.push("/group");
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "グループ切り替えに失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function leaveGroup(membership: AccountMembership) {
    const confirmed = window.confirm(
      `${membership.group_name} から脱退します。この操作は取り消せません。`,
    );

    if (!confirmed) {
      return;
    }

    setBusyAction(`leave:${membership.member_id}`);
    setNotice({
      tone: "neutral",
      message: "グループから脱退しています...",
    });

    try {
      const { error } = await supabase.rpc("leave_my_group", {
        p_member_id: membership.member_id,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await supabase.auth.refreshSession();
      setNotice({
        tone: "success",
        message: "グループから脱退しました。",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "グループ脱退に失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function logout() {
    setBusyAction("logout");

    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  async function signInWithGoogle() {
    setBusyAction("google-signin");
    setNotice({
      tone: "neutral",
      message: "Googleアカウントでログインしています...",
    });

    try {
      // 現在の匿名ユーザーIDを保存（データ引き継ぎ用）
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.is_anonymous) {
        localStorage.setItem('anonymousUserId', user.id);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/account`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      // OAuthの場合はリダイレクトされるので、ここでは何もしない
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "Googleログインに失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "アカウントを削除します。所属情報、日記、引換券も削除されます。この操作は取り消せません。",
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("delete-account");
    setNotice({
      tone: "neutral",
      message: "アカウントを削除しています...",
    });

    try {
      const { error } = await supabase.rpc("delete_my_account");

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "アカウント削除に失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedGroupName = createGroupName.trim();
    const trimmedNickname = createNickname.trim();

    if (!trimmedGroupName || !trimmedNickname) {
      setNotice({
        tone: "error",
        message: "グループ名とニックネームを入力してください。",
      });
      return;
    }

    setBusyAction("create-group");
    setNotice({
      tone: "neutral",
      message: "グループを作成しています...",
    });

    try {
      // タイムアウト付きでRPC呼び出し
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 30000); // 30秒タイムアウト
      });

      const rpcPromise = supabase.rpc("create_group_with_member", {
        p_group_name: trimmedGroupName,
        p_nickname: trimmedNickname,
      });

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      // レスポンスデータを確認
      console.log("Group creation response:", data);

      // refreshSessionを非同期で実行（ブロックしない）
      supabase.auth.refreshSession().catch((err) => {
        console.warn("Session refresh failed:", err);
      });

      setCreateGroupName("");
      setCreateNickname("");
      setNotice({
        tone: "success",
        message: "グループを作成しました。",
      });
      router.refresh();
    } catch (error) {
      console.error("Group creation error:", error);
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "グループ作成に失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function joinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedInviteCode = inviteCode.trim();
    const trimmedNickname = joinNickname.trim();

    if (!uuidPattern.test(trimmedInviteCode)) {
      setNotice({
        tone: "error",
        message: "招待コードはUUID形式で入力してください。",
      });
      return;
    }

    if (!trimmedNickname) {
      setNotice({
        tone: "error",
        message: "ニックネームを入力してください。",
      });
      return;
    }

    setBusyAction("join-group");
    setNotice({
      tone: "neutral",
      message: "グループへ参加しています...",
    });

    try {
      const { error } = await supabase.rpc("join_group_by_invite", {
        p_invite_code: trimmedInviteCode,
        p_nickname: trimmedNickname,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await supabase.auth.refreshSession();
      setInviteCode("");
      setJoinNickname("");
      setNotice({
        tone: "success",
        message: "グループへ参加しました。",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: getErrorMessage(error, "グループ参加に失敗しました。"),
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-16">
      {notice.message && (
        <p
          className={`text-sm font-medium transition-opacity ${noticeClassName(
            notice.tone,
          )}`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </p>
      )}

      <section className="flex items-center gap-8 pb-8 border-b border-gray-100">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">所属グループ</p>
          <p className="text-2xl font-normal text-gray-800">
            {memberships.length}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
            待機中
          </p>
          <p className="text-2xl font-normal text-gray-800">
            {totalPendingTickets} <span className="text-sm text-gray-500">枚</span>
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">履歴</p>
          <p className="text-2xl font-normal text-gray-800">
            {sentHistory.length + receivedHistory.length}
          </p>
        </div>
      </section>

      <section>
        <div className="border-b border-gray-100 pb-4 mb-8">
          <h2 className="text-xl font-medium tracking-tight text-gray-800">
            所属グループ
          </h2>
        </div>

        {memberships.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-gray-500 font-normal">
              所属グループはありません。
            </p>
          </div>
        ) : (
          <div>
            {memberships.map((membership) => {
              const isCurrent = membership.member_id === currentMemberId;
              const isEditing = editingMemberId === membership.member_id;

              return (
                <article
                  key={membership.member_id}
                  className="pb-12 mb-12 border-b-2 border-gray-200 last:border-0 last:mb-0 last:pb-0"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-medium text-gray-800 tracking-tight">
                          {membership.group_name}
                        </h3>
                        {isCurrent && (
                          <span className="text-xs font-medium tracking-widest text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                            active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 uppercase tracking-widest">
                        {membership.member_role}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      引換券 <span className="text-gray-500 ml-1">{membership.pending_ticket_count}</span>
                    </p>
                  </div>

                  <div className="mt-6">
                    {isEditing ? (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            value={nicknameDraft}
                            onChange={(event) =>
                              setNicknameDraft(event.target.value)
                            }
                            className="flex-1 max-w-sm h-10 border-b border-gray-300 px-0 bg-transparent text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
                            maxLength={40}
                            placeholder="新しいニックネーム"
                            autoFocus
                          />
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => saveNickname(membership.member_id)}
                              disabled={busyAction !== null || !nicknameDraft.trim()}
                              className="text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemberId(null)}
                              disabled={busyAction !== null}
                              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-700">アイコンを選択</p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {iconOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setIconDraft(option.id)}
                                className={`rounded-2xl border px-3 py-3 text-left transition ${
                                  iconDraft === option.id
                                    ? "border-emerald-400 bg-emerald-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={option.src}
                                    alt={option.label}
                                    className="w-7 h-7 object-contain"
                                  />
                                  <span className="text-sm text-gray-800">
                                    {option.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={`/${normalizeIconId(membership.member_icon)}.png`}
                            alt="アイコン"
                            className="w-5 h-5 object-contain"
                          />
                          <p className="text-sm text-gray-500">
                            {membership.nickname}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => beginEdit(membership)}
                          disabled={busyAction !== null}
                          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                        >
                          編集
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => openDashboard(membership.member_id)}
                      disabled={busyAction !== null || isCurrent}
                      className="text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 disabled:text-gray-500 transition-colors"
                    >
                      ダッシュボードを開く
                    </button>
                    <button
                      type="button"
                      onClick={() => leaveGroup(membership)}
                      disabled={busyAction !== null}
                      className="text-sm text-rose-600 hover:text-rose-700 disabled:opacity-30 transition-colors"
                    >
                      脱退する
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-12 lg:grid-cols-2 pt-8 border-t border-gray-100">
        <form onSubmit={joinGroup} className="space-y-6 p-6 sm:p-8 rounded-2xl bg-gray-50/80 border border-gray-100">
          <div className="pb-4">
            <h2 className="text-xl font-medium text-gray-800 tracking-tight">
              招待コードで参加
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
                className="w-full h-10 border-b border-gray-200 bg-transparent px-0 font-mono text-sm text-gray-800 focus:outline-none focus:border-gray-800 transition-colors placeholder-gray-300"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
                ニックネーム
              </span>
              <input
                value={joinNickname}
                onChange={(event) => setJoinNickname(event.target.value)}
                className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
                maxLength={40}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busyAction !== null || !inviteCode.trim() || !joinNickname.trim()}
            className="w-full text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors pt-2 pb-2 bg-white border border-gray-200 rounded-xl shadow-sm"
          >
            グループに参加
          </button>
        </form>

        <form onSubmit={createGroup} className="space-y-6 p-6 sm:p-8 rounded-2xl bg-gray-50/80 border border-gray-100">
          <div className="pb-4">
            <h2 className="text-xl font-medium text-gray-800 tracking-tight">
              新規グループ作成
            </h2>
          </div>
          <div className="space-y-6">
            <label className="block">
              <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
                グループ名
              </span>
              <input
                value={createGroupName}
                onChange={(event) => setCreateGroupName(event.target.value)}
                className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
                maxLength={60}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium tracking-widest text-gray-500 uppercase mb-2">
                ニックネーム
              </span>
              <input
                value={createNickname}
                onChange={(event) => setCreateNickname(event.target.value)}
                className="w-full h-10 border-b border-gray-200 bg-transparent px-0 text-base text-gray-800 focus:outline-none focus:border-gray-800 transition-colors"
                maxLength={40}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busyAction !== null || !createGroupName.trim() || !createNickname.trim()}
            className="w-full text-sm font-medium text-gray-800 hover:text-black disabled:opacity-30 transition-colors pt-2 pb-2 bg-white border border-gray-200 rounded-xl shadow-sm"
          >
            グループを作成
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
          <h2 className="text-xl font-medium tracking-tight text-gray-800">
            活動履歴
          </h2>
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setHistoryTab("sent")}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                historyTab === "sent"
                  ? "text-gray-800"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <img src="/soy_sauce.png" alt="" className={`w-4 h-4 object-contain transition-opacity ${historyTab === 'sent' ? 'opacity-80' : 'opacity-40 grayscale'}`} />
              <span>送信履歴</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab("received")}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                historyTab === "received"
                  ? "text-gray-800"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <img src="/soy_sauce.png" alt="" className={`w-4 h-4 object-contain transition-opacity ${historyTab === 'received' ? 'opacity-80' : 'opacity-40 grayscale'}`} />
              <span>受信履歴</span>
            </button>
          </div>
        </div>

        {historyTab === "sent" ? (
          <HistoryList
            emptyMessage="送信履歴はありません。"
            items={sentHistory.map((item) => ({
              id: item.diary_id,
              at: item.created_at,
              title: item.group_name,
              subtitle: item.author_nickname,
              content: item.content,
            }))}
          />
        ) : (
          <HistoryList
            emptyMessage="受信履歴はありません。"
            items={receivedHistory.map((item) => ({
              id: item.read_id,
              at: item.diary_created_at,
              title: item.group_name,
              subtitle: item.author_nickname,
              content: item.content,
            }))}
          />
        )}
      </section>

      <section className="pt-16 border-t border-gray-100 pb-8">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">アカウント設定</h3>
            <div className="flex flex-col gap-4">
              {session?.user?.app_metadata?.provider === 'google' ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-800">Googleアカウントでログイン中</p>
                    <p className="text-xs text-emerald-600">{session.user.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 bg-emerald-100 border border-emerald-300 rounded-lg text-sm font-medium text-emerald-800 cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    認証済み
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">匿名アカウント</p>
                    <p className="text-xs text-gray-600">Googleアカウントと連携してデータを保持できます</p>
                  </div>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={busyAction !== null}
                    className="ml-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google連携
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={logout}
              disabled={busyAction !== null}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30"
            >
              ログアウト
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busyAction !== null}
              className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-30"
            >
              アカウントを削除する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryList({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: Array<{
    id: string;
    at: string;
    title: string;
    subtitle: string;
    content: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-base text-gray-500 font-normal">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol>
      {items.map((item) => (
        <li
          key={item.id}
          className="pb-16 mb-16 border-b-2 border-gray-200 last:border-0 last:mb-0 last:pb-0"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
              {item.subtitle.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {item.subtitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{item.title}</span>
                <span>&middot;</span>
                <time dateTime={item.at}>
                  {dateFormatter.format(new Date(item.at))}
                </time>
              </div>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-base leading-loose text-gray-800 font-normal tracking-wide">
            {item.content}
          </p>
        </li>
      ))}
    </ol>
  );
}
