"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import type { DiaryEntry, DiaryRow, MemberRow, ReadRow } from "@/utils/diary";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type DiaryTimelineProps = {
  memberId: string;
  initialEntries: DiaryEntry[];
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

async function fetchEntryForRead(
  supabase: SupabaseClient,
  read: ReadRow,
): Promise<DiaryEntry> {
  const { data: diary, error: diaryError } = await supabase
    .from("diaries")
    .select("id, created_at, content, author_id")
    .eq("id", read.diary_id)
    .single<DiaryRow>();

  if (diaryError) {
    throw new Error(formatSupabaseError(diaryError));
  }

  const { data: author } = await supabase
    .from("group_members")
    .select("id, nickname")
    .eq("id", diary.author_id)
    .maybeSingle<MemberRow>();

  return {
    readId: read.id,
    readCreatedAt: read.created_at,
    diaryId: diary.id,
    diaryCreatedAt: diary.created_at,
    content: diary.content,
    authorId: diary.author_id,
    authorName: author?.nickname ?? "匿名メンバー",
  };
}

export function DiaryTimeline({
  memberId,
  initialEntries,
}: DiaryTimelineProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState(initialEntries);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const channel = supabase
      .channel(`reads-${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reads",
          filter: `user_id=eq.${memberId}`,
        },
        async (payload) => {
          const read = payload.new as ReadRow;

          try {
            const entry = await fetchEntryForRead(supabase, read);

            setEntries((currentEntries) => {
              if (
                currentEntries.some(
                  (currentEntry) => currentEntry.readId === entry.readId,
                )
              ) {
                return currentEntries;
              }

              return [entry, ...currentEntries];
            });
            setNotice("新しい日記が届きました！");
            window.setTimeout(() => setNotice(""), 4000);
          } catch (error) {
            setNotice(
              error instanceof Error
                ? error.message
                : "新着日記の取得に失敗しました。",
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, supabase]);

  return (
    <section>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
        <h2 className="text-xl font-medium tracking-tight text-gray-800">
          届いた日記
        </h2>
        <p
          className="text-sm font-medium text-emerald-600 transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-base text-gray-600 font-normal">
            まだ日記は届いていません。
          </p>
          <p className="mt-3 text-sm text-gray-600 font-normal">
            投稿すると、交換できる日記があればここに表示されます。
          </p>
        </div>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li
              key={entry.readId}
              className="pb-16 mb-16 border-b-2 border-gray-200 last:border-0"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {entry.authorName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {entry.authorName}
                  </p>
                  <time
                    dateTime={entry.diaryCreatedAt}
                    className="text-xs text-gray-600"
                  >
                    {dateFormatter.format(new Date(entry.diaryCreatedAt))}
                  </time>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-base leading-loose text-gray-800 font-normal tracking-wide">
                {entry.content}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
