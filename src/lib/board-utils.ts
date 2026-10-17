import { COLUMNS, type Status, type Task } from "./types";

export const STATUSES: Status[] = COLUMNS.map((c) => c.id);

export const isStatus = (id: string): id is Status => STATUSES.includes(id as Status);

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "エラーが発生しました";
}

/** タスクを列ごとに振り分け、position 順に並べる */
export function groupByStatus(tasks: Task[]): Record<Status, Task[]> {
  const groups: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
  const sorted = [...tasks].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
  for (const task of sorted) {
    groups[task.status].push(task);
  }
  // 進行中は期限の近い順（期限なしは最後）。同じ期限なら position 順のまま
  const dueTime = (t: Task) => (t.due_date ? new Date(t.due_date).getTime() : Infinity);
  groups.in_progress.sort((a, b) => dueTime(a) - dueTime(b) || 0);
  return groups;
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export interface MoveResult {
  /** 永続化が必要な変更分 */
  updates: { id: string; status: Status; position: number }[];
  /** 画面更新用の全タスク（楽観的更新に使用） */
  next: Task[];
}

/**
 * ドラッグ結果から新しい状態を計算する純粋関数。
 * overId は「列のID（status）」または「別タスクのID」のどちらか。
 */
export function computeMove(tasks: Task[], activeId: string, overId: string): MoveResult | null {
  const active = tasks.find((t) => t.id === activeId);
  if (!active) return null;

  const overIsColumn = isStatus(overId);
  const overTask = overIsColumn ? undefined : tasks.find((t) => t.id === overId);
  if (!overIsColumn && !overTask) return null;

  const targetStatus: Status = overIsColumn ? (overId as Status) : overTask!.status;
  const sourceStatus = active.status;
  const groups = groupByStatus(tasks);
  const lists: Record<Status, Task[]> = {
    todo: [...groups.todo],
    in_progress: [...groups.in_progress],
    done: [...groups.done],
  };

  if (sourceStatus === targetStatus) {
    // 同一列内の並べ替え
    const list = lists[sourceStatus];
    const from = list.findIndex((t) => t.id === activeId);
    const to = overIsColumn ? list.length - 1 : list.findIndex((t) => t.id === overId);
    if (from < 0 || to < 0) return null;
    lists[sourceStatus] = arrayMove(list, from, to);
  } else {
    // 別列への移動
    lists[sourceStatus] = lists[sourceStatus].filter((t) => t.id !== activeId);
    const target = lists[targetStatus];
    const index = overIsColumn ? target.length : target.findIndex((t) => t.id === overId);
    target.splice(index < 0 ? target.length : index, 0, { ...active, status: targetStatus });
  }

  const originals = new Map(tasks.map((t) => [t.id, t]));
  const updated = new Map<string, Task>();
  const updates: MoveResult["updates"] = [];

  for (const status of STATUSES) {
    lists[status].forEach((task, index) => {
      const original = originals.get(task.id);
      if (!original) return;
      if (original.status !== status || original.position !== index) {
        updates.push({ id: task.id, status, position: index });
      }
      updated.set(task.id, { ...original, status, position: index });
    });
  }

  if (updates.length === 0) return null;
  return { updates, next: tasks.map((t) => updated.get(t.id) ?? t) };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type DueLevel = "none" | "normal" | "urgent" | "overdue";

export interface DueInfo {
  level: DueLevel;
  /** 「あと3日」「あと5時間」「期限切れ」などの表示用テキスト */
  remaining: string | null;
}

function formatRemaining(diff: number): string {
  if (diff < HOUR_MS) return `あと${Math.max(1, Math.ceil(diff / 60000))}分`;
  if (diff < DAY_MS) return `あと${Math.ceil(diff / HOUR_MS)}時間`;
  return `あと${Math.ceil(diff / DAY_MS)}日`;
}

/** 期限までの状態。24時間以内（期限切れを含む）は急ぎ扱い。完了済みは対象外 */
export function getDueInfo(task: Task, now: number): DueInfo {
  if (!task.due_date) return { level: "none", remaining: null };
  if (task.status === "done") return { level: "normal", remaining: null };
  const diff = new Date(task.due_date).getTime() - now;
  if (diff < 0) return { level: "overdue", remaining: "期限切れ" };
  return { level: diff <= DAY_MS ? "urgent" : "normal", remaining: formatRemaining(diff) };
}
