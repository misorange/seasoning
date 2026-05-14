export type AccountMembership = {
  member_id: string;
  group_id: string;
  group_name: string;
  nickname: string;
  member_icon: "salt" | "soy_sauce" | "pepper" | "olive_oil" | "miso" | "harb" | "chili_pepper";
  member_role: "admin" | "member";
  created_at: string;
  last_active_at: string;
  pending_ticket_count: number;
};

export type SentDiaryHistoryItem = {
  diary_id: string;
  created_at: string;
  group_id: string;
  group_name: string;
  author_member_id: string;
  author_nickname: string;
  content: string;
};

export type ReceivedDiaryHistoryItem = {
  read_id: string;
  read_created_at: string;
  diary_id: string;
  diary_created_at: string;
  group_id: string;
  group_name: string;
  author_member_id: string;
  author_nickname: string;
  content: string;
};
