export type ReadRow = {
  id: string;
  created_at: string;
  diary_id: string;
  user_id: string;
};

export type DiaryRow = {
  id: string;
  created_at: string;
  content: string;
  author_id: string;
};

export type MemberRow = {
  id: string;
  nickname: string;
};

export type DiaryEntry = {
  readId: string;
  readCreatedAt: string;
  diaryId: string;
  diaryCreatedAt: string;
  content: string;
  authorId: string;
  authorName: string;
};
