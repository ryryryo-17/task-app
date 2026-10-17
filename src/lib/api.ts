/**
 * データアクセス層（Supabase 版）。
 * 画面側（components / app）はこのファイルの関数だけを使い、Supabase を直接触らない。
 * 権限は DB 側の RLS と関数（0002_fix_rls_and_status.sql）で守る。
 */
import { createClient } from "@/lib/supabase/client";
import type { Board, Profile, Role, Status, Task, TaskInput } from "@/lib/types";

const sb = () => createClient();

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface BoardRow {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
}

interface TaskRow {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: Status;
  position: number;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name,
  created_at: row.created_at,
});

const toTask = (row: TaskRow): Task => ({
  ...row,
  description: row.description ?? null,
  created_by: row.created_by ?? "",
});

/** Supabase の認証エラーを日本語の表示文言へ */
function authMessage(message: string): string {
  if (message.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません";
  if (message.includes("already registered")) return "このメールアドレスは既に登録されています";
  if (message.includes("Password should be at least")) return "パスワードが短すぎます";
  return message;
}

// ---------- 認証 ----------

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await sb()
    .from("profiles")
    .select("id, email, display_name, created_at")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return toProfile(data as ProfileRow);
}

export async function signUp(email: string, password: string): Promise<Profile> {
  const { data, error } = await sb().auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(authMessage(error.message));
  // メール確認が有効な場合はセッションが無い。その旨をユーザーに伝える
  if (!data.session || !data.user) {
    throw new Error("確認メールを送信しました。メール内のリンクを開いてからログインしてください");
  }
  return fetchProfile(data.user.id);
}

export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await sb().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(authMessage(error.message));
  return fetchProfile(data.user.id);
}

export async function signOut(): Promise<void> {
  const { error } = await sb().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser(): Promise<Profile | null> {
  const { data } = await sb().auth.getUser();
  return data.user ? fetchProfile(data.user.id) : null;
}

/** ログイン状態の変化を購読する。戻り値は購読解除関数 */
export function onAuthChange(listener: (userId: string | null) => void): () => void {
  const { data } = sb().auth.onAuthStateChange((_event, session) => {
    listener(session?.user.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ---------- ボード・メンバー ----------

/**
 * ユーザーが所属する最新のボードを返す。
 * 無ければ「マイボード」を作成する（作成時はトリガーでオーナー行が入る）。
 */
// 同じユーザーの取得が同時に走ったとき（StrictMode の二重実行など）に、
// ボードを二重に作らないよう進行中の処理を共有する
const pendingBoards = new Map<string, Promise<{ board: Board; role: Role }>>();

export function getBoardForUser(userId: string): Promise<{ board: Board; role: Role }> {
  const existing = pendingBoards.get(userId);
  if (existing) return existing;

  const request = loadOrCreateBoard(userId).finally(() => {
    pendingBoards.delete(userId);
  });
  pendingBoards.set(userId, request);
  return request;
}

/** 所属ボードを取得する。無ければ DB 側の関数が1つだけ作る（同時呼び出しでも二重にならない） */
async function loadOrCreateBoard(userId: string): Promise<{ board: Board; role: Role }> {
  const { data: boardId, error: rpcError } = await sb().rpc("get_or_create_board");
  if (rpcError) throw new Error(rpcError.message);
  if (!boardId) throw new Error("ボードの取得に失敗しました");

  const [boardResult, memberResult] = await Promise.all([
    sb().from("boards").select("id, title, owner_id, created_at").eq("id", boardId as string).single(),
    sb().from("board_members").select("role").eq("board_id", boardId as string).eq("user_id", userId).single(),
  ]);
  if (boardResult.error) throw new Error(boardResult.error.message);
  if (memberResult.error) throw new Error(memberResult.error.message);

  return {
    board: boardResult.data as BoardRow,
    role: (memberResult.data as { role: Role }).role,
  };
}

/** ボードメンバーの表示名（user_id → 名前） */
export async function getMemberNames(boardId: string): Promise<Record<string, string>> {
  const { data, error } = await sb()
    .from("board_members")
    .select("user_id, profiles(display_name, email)")
    .eq("board_id", boardId);
  if (error) throw new Error(error.message);

  const names: Record<string, string> = {};
  const rows = (data ?? []) as unknown as {
    user_id: string;
    profiles: { display_name: string | null; email: string } | null;
  }[];
  for (const row of rows) {
    names[row.user_id] = row.profiles?.display_name ?? row.profiles?.email ?? "不明なユーザー";
  }
  return names;
}

/** 招待リンク用トークンを取得（オーナーのみ） */
export async function getInviteToken(boardId: string): Promise<string> {
  const { data, error } = await sb().rpc("get_invite_token", { p_board_id: boardId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("招待リンクを発行できるのはオーナーのみです");
  return data as string;
}

/** 招待トークンでボードに参加する */
export async function joinBoardByToken(token: string): Promise<void> {
  if (!UUID_PATTERN.test(token)) throw new Error("招待リンクが無効です");
  const { error } = await sb().rpc("join_board_by_token", { p_token: token });
  if (error) throw new Error(error.message);
}

// ---------- タスク ----------

export async function listTasks(boardId: string): Promise<Task[]> {
  const { data, error } = await sb()
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TaskRow[]).map(toTask);
}

export async function createTask(boardId: string, input: TaskInput, userId: string): Promise<void> {
  // 同じ列の末尾に追加する
  const { data: last, error: lastError } = await sb()
    .from("tasks")
    .select("position")
    .eq("board_id", boardId)
    .eq("status", input.status)
    .order("position", { ascending: false })
    .limit(1);
  if (lastError) throw new Error(lastError.message);
  const position = last && last.length > 0 ? (last[0] as { position: number }).position + 1 : 0;

  const { error } = await sb().from("tasks").insert({
    board_id: boardId,
    title: input.title,
    description: input.description,
    status: input.status,
    due_date: input.due_date,
    position,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<void> {
  const { error } = await sb()
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await sb().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** ドラッグ＆ドロップ後の status / position をまとめて反映 */
export async function moveTasks(updates: { id: string; status: Status; position: number }[]): Promise<void> {
  const now = new Date().toISOString();
  const results = await Promise.all(
    updates.map((u) =>
      sb().from("tasks").update({ status: u.status, position: u.position, updated_at: now }).eq("id", u.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/**
 * タスクの変更を購読する（Supabase Realtime）。
 * RLS により、自分が参加しているボードの変更だけが届く。戻り値は購読解除関数。
 */
export function subscribeToTasks(boardId: string, listener: () => void): () => void {
  const client = sb();
  const channel = client
    .channel(`tasks:${boardId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` }, listener)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
