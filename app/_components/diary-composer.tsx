"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatSupabaseError } from "@/utils/supabase/errors";

type DiaryComposerProps = {
  groupId: string;
  memberId: string;
};

export function DiaryComposer({ groupId, memberId }: DiaryComposerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const trimmedLength = content.trim().length;
  const canSubmit = trimmedLength >= 20 && !submitting;
  const remainingCount = Math.max(20 - trimmedLength, 0);

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (trimmedContent.length < 20) {
      setMessage("日記は20文字以上で書いてください。");
      return;
    }

    setSubmitting(true);
    setMessage("送信しています...");

    try {
      const { error } = await supabase.from("diaries").insert({
        group_id: groupId,
        author_id: memberId,
        content: trimmedContent,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setContent("");
      setMessage("");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "日記の送信に失敗しました。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 z-40 flex items-center justify-center w-16 h-16 bg-white border border-gray-200 shadow-sm rounded-full transition-transform hover:scale-105"
        aria-label="日記を書く"
      >
        <img src="/pepper.png" alt="日記を書く" className="w-8 h-8 object-contain opacity-80" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <header className="flex items-center justify-between px-8 py-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className={`text-sm tracking-widest ${trimmedLength >= 20 ? 'text-gray-800' : 'text-gray-500'}`}>
              {remainingCount > 0 ? `${remainingCount} more` : "✓"}
            </span>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-8 pb-12"
          >
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="flex-1 w-full resize-none border-none bg-transparent px-0 py-8 text-xl leading-loose text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-0"
              placeholder="ここに日記を書く"
              autoFocus
            />

            <div className="flex items-center justify-between pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-500" role="status" aria-live="polite">
                {message}
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-8 py-3 text-sm font-medium tracking-widest text-white uppercase bg-gray-900 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                {submitting ? "送信中..." : "日記を送る"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
