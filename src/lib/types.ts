export type Status = "todo" | "in_progress" | "done";
export type Role = "owner" | "member";

/** カンバンの固定列（表示順）。"todo" は DB 上の値として残すが、画面には出さない */
export const COLUMNS: { id: Status; title: string }[] = [
  { id: "in_progress", title: "進行中" },
  { id: "done", title: "完了" },
];

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: Status;
  position: number;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 作成・編集フォームから渡される入力値 */
export interface TaskInput {
  title: string;
  description: string | null;
  status: Status;
  due_date: string | null;
}
