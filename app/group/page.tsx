import Link from "next/link";
import { redirect } from "next/navigation";
import { DiaryComposer } from "../_components/diary-composer";
import { DiaryTimeline } from "../_components/diary-timeline";
import { CopyInviteLink } from "../_components/copy-invite-link";
import type { DiaryEntry, DiaryRow, MemberRow, ReadRow } from "@/utils/diary";
import { createClient } from "@/utils/supabase/server";
import { formatSupabaseError } from "@/utils/supabase/errors";
import {
  getMembershipClaimsFromAccessToken,
  hasMembershipClaims,
} from "@/utils/supabase/session";
import type { AccountMembership } from "@/utils/account";
import { GroupSwitcher } from "../_components/group-switcher";
import { GroupSelector } from "../_components/group-selector";

type GroupRow = {
  id: string;
  name: string;
  invite_code: string;
};

type MemberProfile = {
  id: string;
  nickname: string;
  role: "admin" | "member";
};

async function getTimelineEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: readsData, error: readsError } = await supabase
    .from("reads")
    .select("id, created_at, diary_id, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (readsError) {
    return {
      entries: [] as DiaryEntry[],
      error: formatSupabaseError(readsError),
    };
  }

  const reads = (readsData ?? []) as ReadRow[];
  const diaryIds = [...new Set(reads.map((read) => read.diary_id))];

  if (diaryIds.length === 0) {
    return {
      entries: [] as DiaryEntry[],
      error: "",
    };
  }

  const { data: diariesData, error: diariesError } = await supabase
    .from("diaries")
    .select("id, created_at, content, author_id")
    .in("id", diaryIds);

  if (diariesError) {
    return {
      entries: [] as DiaryEntry[],
      error: formatSupabaseError(diariesError),
    };
  }

  const diaries = (diariesData ?? []) as DiaryRow[];
  const authorIds = [...new Set(diaries.map((diary) => diary.author_id))];
  const { data: authorsData } =
    authorIds.length > 0
      ? await supabase
          .from("group_members")
          .select("id, nickname")
          .in("id", authorIds)
      : { data: [] };

  const diaryById = new Map(diaries.map((diary) => [diary.id, diary]));
  const authorById = new Map(
    ((authorsData ?? []) as MemberRow[]).map((author) => [
      author.id,
      author.nickname,
    ]),
  );

  return {
    entries: reads
      .map((read) => {
        const diary = diaryById.get(read.diary_id);

        if (!diary) {
          return null;
        }

        return {
          readId: read.id,
          readCreatedAt: read.created_at,
          diaryId: diary.id,
          diaryCreatedAt: diary.created_at,
          content: diary.content,
          authorId: diary.author_id,
          authorName: authorById.get(diary.author_id) ?? "匿名メンバー",
        };
      })
      .filter((entry): entry is DiaryEntry => entry !== null),
    error: "",
  };
}

type GroupPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GroupPage({ searchParams }: GroupPageProps) {
  const params = await searchParams;
  const forceSelect = "select" in params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = getMembershipClaimsFromAccessToken(session?.access_token);

  // 認証済みだがグループ未選択、または ?select で強制表示 → グループ選択画面を表示
  if (!hasMembershipClaims(claims) || forceSelect) {
    if (!session) {
      redirect("/");
    }

    const membershipsResult = await supabase.rpc(
      "get_my_account_memberships",
      {},
      { get: true },
    );
    const memberships = (membershipsResult.data ?? []) as AccountMembership[];

    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
          <header className="border-b border-gray-100 pb-8">
            <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
              Seasoning
            </p>
            <h1 className="mt-1 text-2xl font-medium leading-tight text-gray-800 tracking-tight">
              グループを選択
            </h1>
          </header>

          <div className="py-8">
            <GroupSelector memberships={memberships} />
          </div>
        </div>
      </main>
    );
  }

  const [groupResult, memberResult, pendingResult, timelineResult, membershipsResult] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name, invite_code")
        .eq("id", claims.groupId)
        .maybeSingle(),
      supabase
        .from("group_members")
        .select("id, nickname, role")
        .eq("id", claims.memberId)
        .maybeSingle(),
      supabase
        .from("pending_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      getTimelineEntries(supabase),
      supabase.rpc("get_my_account_memberships", {}, { get: true }),
    ]);

  const group = groupResult.data as GroupRow | null;
  const member = memberResult.data as MemberProfile | null;
  const pendingTicketCount = pendingResult.count ?? 0;
  const memberships = (membershipsResult.data ?? []) as AccountMembership[];

  if (!group || !member) {
    redirect("/");
  }

  const invitePath = `/group/invite/${group.invite_code}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
        <header className="pb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <GroupSwitcher currentMemberId={claims.memberId} memberships={memberships} />
            <Link
              href="/account"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              <img src="/salt.png" alt="" className="w-5 h-5 object-contain opacity-80" />
              <span>マイアカウント</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between gap-4 py-4 border-y border-gray-100">
            <p className="text-sm font-medium text-gray-600">
              {member.nickname} <span className="text-gray-500 tracking-widest uppercase ml-1 text-xs">{member.role}</span>
            </p>
            <CopyInviteLink invitePath={invitePath} />
          </div>
        </header>

        <section className="flex items-center gap-8 pb-8 mb-8 border-b border-gray-100">
          <div className="flex items-baseline gap-2">
            <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">待機中</p>
            <p className="text-2xl font-normal text-gray-800">
              {pendingTicketCount} <span className="text-sm text-gray-500">枚</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-sm font-medium text-gray-600">
              届いた日記は自動で追加されます
            </p>
          </div>
        </section>

        {(groupResult.error || memberResult.error || pendingResult.error) && (
          <p className="my-8 text-sm text-rose-600">
            {formatSupabaseError(
              groupResult.error ?? memberResult.error ?? pendingResult.error!,
            )}
          </p>
        )}

        {timelineResult.error && (
          <p className="my-8 text-sm text-rose-600">
            {timelineResult.error}
          </p>
        )}

        <div className="py-12">
          <DiaryTimeline
            memberId={claims.memberId}
            initialEntries={timelineResult.entries}
          />
        </div>

        <DiaryComposer groupId={claims.groupId} memberId={claims.memberId} />
      </div>
    </main>
  );
}

