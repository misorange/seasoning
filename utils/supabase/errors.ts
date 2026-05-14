type ErrorLike = {
  code?: string;
  message?: string;
};

export function formatSupabaseError(error: ErrorLike) {
  if (error.code === "23514") {
    return "日記は20文字以上で書いてください。";
  }

  if (error.code === "42501" || /permission|policy|rls/i.test(error.message ?? "")) {
    return "権限がありません。参加状態や利用制限を確認してください。";
  }

  if (/Invalid invite_code/i.test(error.message ?? "")) {
    return "招待コードが見つかりませんでした。";
  }

  if (error.code === "23505" || /duplicate key/i.test(error.message ?? "")) {
    return "このグループにはすでに参加しています。";
  }

  return error.message ?? "通信に失敗しました。時間をおいて再試行してください。";
}
