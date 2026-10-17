"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlarmClock, CalendarDays, Check } from "lucide-react";
import BreakEffect from "@/components/BreakEffect";
import { getDueInfo } from "@/lib/board-utils";
import type { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  author: string;
  /** 現在時刻（ms）。期限の急ぎ判定に使う */
  now: number;
  onOpen: (task: Task) => void;
  /** 指定時のみチェックボタンを表示（押すとブロックが砕けて完了列へ移動） */
  onComplete?: (task: Task) => void;
  /** 完了演出の再生中 */
  breaking?: boolean;
}

/** ドラッグ可能なカード（列内のソート対象） */
export default function TaskCard({ task, author, now, onOpen, onComplete, breaking = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: breaking,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!breaking) onOpen(task);
      }}
      className={`cursor-grab touch-manipulation active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCardBody task={task} author={author} now={now} onComplete={onComplete} breaking={breaking} />
    </div>
  );
}

interface TaskCardBodyProps {
  task: Task;
  author: string;
  now: number;
  className?: string;
  onComplete?: (task: Task) => void;
  breaking?: boolean;
}

const RIVETS = ["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"];

/**
 * カードの見た目（ドラッグ中のオーバーレイでも再利用）。
 * 進行中はハテナブロック、24時間以内は赤いブロック、完了は空ブロック風。
 */
export function TaskCardBody({ task, author, now, className = "", onComplete, breaking = false }: TaskCardBodyProps) {
  const done = task.status === "done";
  const due = getDueInfo(task, now);
  const urgent = due.level === "urgent" || due.level === "overdue";

  const tone = done
    ? "bg-[#c9a36b] shadow-usedblock"
    : urgent
      ? "fx-urgent bg-[#e52521] text-white shadow-qblock"
      : "bg-mario-coin shadow-qblock";
  const subText = urgent ? "text-white/90" : "text-black/70";

  return (
    <div className="relative">
      <div
        className={`relative flex w-full items-start gap-2 border-4 border-mario-ink p-3 text-left transition-transform hover:-translate-y-0.5 ${tone} ${
          breaking ? "fx-block-break" : ""
        } ${className}`}
      >
        {RIVETS.map((pos) => (
          <span key={pos} aria-hidden className={`pointer-events-none absolute h-1.5 w-1.5 bg-mario-ink/70 ${pos}`} />
        ))}

        {onComplete && (
          // ドラッグ開始・カード詳細表示と干渉しないようイベントを止める
          <button
            type="button"
            aria-label={`「${task.title}」を完了にする`}
            title="完了にする"
            disabled={breaking}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task);
            }}
            className="relative flex h-7 w-7 shrink-0 items-center justify-center border-4 border-mario-ink bg-white text-transparent shadow-block-sm hover:bg-mario-pipe hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none"
          >
            <Check size={16} strokeWidth={4} aria-hidden />
          </button>
        )}
        {done && (
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center border-4 border-mario-ink bg-mario-pipe text-white">
            <Check size={16} strokeWidth={4} aria-hidden />
          </span>
        )}

        <div className="relative min-w-0 flex-1">
          <p className={`break-words text-sm font-bold leading-snug ${done ? "line-through opacity-70" : ""}`}>
            {task.title}
          </p>
          {task.description && <p className={`mt-1 line-clamp-2 text-xs ${subText}`}>{task.description}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            {task.due_date ? (
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1 border-2 border-mario-ink bg-white px-1.5 py-0.5 text-[11px] font-bold ${
                    urgent ? "text-[#e52521]" : "text-mario-ink"
                  }`}
                >
                  {urgent ? <AlarmClock size={12} aria-hidden /> : <CalendarDays size={12} aria-hidden />}
                  {formatDue(task.due_date)}
                </span>
                {due.remaining && (
                  <span
                    className={`border-2 border-mario-ink px-1.5 py-0.5 text-[11px] font-black ${
                      urgent ? "bg-mario-coin text-mario-ink" : "bg-white text-mario-ink"
                    }`}
                  >
                    {due.remaining}
                  </span>
                )}
              </div>
            ) : (
              <span />
            )}
            <span className={`truncate text-[11px] font-bold ${subText}`}>{author}</span>
          </div>
        </div>
      </div>

      {breaking && <BreakEffect />}
    </div>
  );
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
