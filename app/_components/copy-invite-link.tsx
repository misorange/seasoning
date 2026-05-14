"use client";

import { useState } from "react";

export function CopyInviteLink({ invitePath }: { invitePath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // In a real browser, this needs the full URL. We'll construct it from window.location.origin
      const fullUrl = `${window.location.origin}${invitePath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-3 py-1.5 transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {copied ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        )}
      </svg>
      {copied ? "コピーしました" : "招待リンクをコピー"}
    </button>
  );
}
