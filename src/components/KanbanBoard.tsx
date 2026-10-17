"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TaskCard, { TaskCardBody } from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import { computeMove, errorMessage, groupByStatus, isStatus } from "@/lib/board-utils";
import * as api from "@/lib/api";
import { playBreak, playCoin, playJump } from "@/lib/sound";
import { COLUMNS, type Status, type Task, type TaskInput } from "@/lib/types";

interface KanbanBoardProps {
  boardId: string;
  currentUserId: string;
}

/** 完了演出（マリオのジャンプ→ブロック破壊）の長さ。globals.css の .fx-* と合わせる */
const BREAK_MS = 1000;

type ModalState = { mode: "create"; status: Status } | { mode: "edit"; task: Task } | null;

/** 3列固定のカンバンボード（ドラッグ＆ドロップ・タスク作成/編集） */
export default function KanbanBoard({ boardId, currentUserId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakingIds, setBreakingIds] = useState<Set<string>>(() => new Set());

  // 期限が24時間以内かどうかの判定用。時間の経過で赤表示に切り替わるよう1分ごとに更新
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // 演出後に遅延して移動するため、常に最新の一覧を参照できるようにしておく
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const reload = useCallback(async () => {
    const list = await api.listTasks(boardId);
    // 未対応列を廃止したため、既存の "todo" タスクは進行中として扱う
    setTasks(list.map((t) => (t.status === "todo" ? { ...t, status: "in_progress" as const } : t)));
  }, [boardId]);

  // 表示名（作成者の名前）。メンバーの参加はページ読み込み時点の一覧で扱う
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    api.getMemberNames(boardId).then(setNames).catch(() => {});
  }, [boardId]);

  // タスクの変更を Realtime で購読し、届いたら一覧を読み直す
  useEffect(() => {
    reload().catch((err: unknown) => setError(errorMessage(err)));
    return api.subscribeToTasks(boardId, () => {
      reload().catch((err: unknown) => setError(errorMessage(err)));
    });
  }, [boardId, reload]);

  const sensors = useSensors(
    // 5px 以上動かした時だけドラッグ扱いにし、クリックで詳細を開けるようにする
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupByStatus(tasks), [tasks]);
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function applyMove(activeTaskId: string, overId: string) {
    // 進行中は期限順に自動で並ぶため、進行中の列内での手動並べ替えは行わない
    const list = tasksRef.current;
    const activeStatus = list.find((t) => t.id === activeTaskId)?.status;
    const targetStatus = isStatus(overId) ? overId : list.find((t) => t.id === overId)?.status;
    if (activeStatus === "in_progress" && targetStatus === "in_progress") return;

    const result = computeMove(list, activeTaskId, overId);
    if (!result) return;

    // 楽観的更新：先に画面へ反映し、保存に失敗したら再読込で巻き戻す
    setTasks(result.next);
    try {
      await api.moveTasks(result.updates);
    } catch (err) {
      setError(errorMessage(err));
      await reload();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    await applyMove(String(active.id), String(over.id));
  }

  /** チェックボタン：ブロック破壊の演出を見せてから、完了列の末尾へ自動で移動 */
  function handleComplete(task: Task) {
    if (breakingIds.has(task.id)) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      playCoin();
      void applyMove(task.id, "done");
      return;
    }

    setBreakingIds((prev) => new Set(prev).add(task.id));
    playJump();
    // ブロックに頭がぶつかる瞬間（演出の0.4秒時点）に破壊音とコイン音
    window.setTimeout(() => {
      playBreak();
      playCoin();
    }, BREAK_MS * 0.4);
    window.setTimeout(async () => {
      await applyMove(task.id, "done");
      setBreakingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }, BREAK_MS);
  }

  async function handleSave(input: TaskInput) {
    if (!modal) return;
    if (modal.mode === "create") {
      await api.createTask(boardId, input, currentUserId);
    } else {
      await api.updateTask(modal.task.id, input);
    }
    setModal(null);
  }

  async function handleDelete() {
    if (!modal || modal.mode !== "edit") return;
    if (!window.confirm("このタスクを削除しますか？")) return;
    await api.deleteTask(modal.task.id);
    setModal(null);
  }

  return (
    <>
      {error && (
        <p role="alert" className="mx-4 mt-4 border-4 border-mario-ink bg-mario-brick px-4 py-2 text-sm font-bold text-white">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto p-4 md:grid md:grid-cols-2 md:overflow-visible">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              status={column.id}
              title={column.title}
              tasks={grouped[column.id]}
              authorName={(id) => names[id] ?? "不明なユーザー"}
              onAdd={column.id === "in_progress" ? () => setModal({ mode: "create", status: column.id }) : undefined}
              onComplete={column.id === "in_progress" ? handleComplete : undefined}
              breakingIds={breakingIds}
              now={now}
              onOpen={(task) => setModal({ mode: "edit", task })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCardBody
              task={activeTask}
              author={names[activeTask.created_by] ?? "不明なユーザー"}
              now={now}
              className="rotate-2 shadow-lg"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TaskModal
          key={modal.mode === "edit" ? modal.task.id : `new-${modal.status}`}
          initial={modal.mode === "edit" ? modal.task : null}
          defaultStatus={modal.mode === "create" ? modal.status : "in_progress"}
          author={modal.mode === "edit" ? (names[modal.task.created_by] ?? "不明なユーザー") : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
        />
      )}
    </>
  );
}

interface ColumnProps {
  status: Status;
  title: string;
  tasks: Task[];
  authorName: (userId: string) => string;
  /** 指定時のみ「タスクを追加」ボタンを表示 */
  onAdd?: () => void;
  /** 指定時のみ各カードにチェックボタンを表示 */
  onComplete?: (task: Task) => void;
  /** 完了演出の再生中のタスクID */
  breakingIds: Set<string>;
  now: number;
  onOpen: (task: Task) => void;
}

/** 1列分。列自体がドロップ先になり、空の列へも移動できる */
function Column({ status, title, tasks, authorName, onAdd, onComplete, breakingIds, now, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="pixel-panel flex w-72 shrink-0 flex-col md:w-auto">
      {/* 土管風の見出し */}
      <header className="flex items-center justify-between border-b-4 border-mario-ink bg-mario-pipe px-3 py-2">
        <h2 className="pixel-title text-sm">{title}</h2>
        <span className="border-2 border-mario-ink bg-mario-coin px-2 text-xs font-bold">{tasks.length}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-[140px] flex-1 flex-col gap-3 p-3 transition-colors ${
          isOver ? "bg-yellow-100" : "bg-[#fdf6e3]"
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              author={authorName(task.created_by)}
              now={now}
              onOpen={onOpen}
              onComplete={onComplete}
              breaking={breakingIds.has(task.id)}
            />
          ))}
        </SortableContext>
      </div>

      {/* ハテナブロック風の追加ボタン */}
      {onAdd && (
        <button type="button" onClick={onAdd} className="pixel-btn pixel-btn-coin m-3 mt-0 justify-start">
          <span className="flex h-5 w-5 items-center justify-center border-2 border-mario-ink bg-white text-xs font-black">
            ?
          </span>
          タスクを追加
        </button>
      )}
    </section>
  );
}
