"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/board-utils";
import type { Status, Task, TaskInput } from "@/lib/types";

interface TaskModalProps {
  /** null の場合は新規作成 */
  initial: Task | null;
  defaultStatus: Status;
  /** 編集時の作成者表示名 */
  author?: string;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  /** 指定時のみ削除ボタンを表示 */
  onDelete?: () => Promise<void>;
}

/** ISO 文字列 → datetime-local の入力値（ローカル時刻） */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local の入力値 → ISO 文字列 */
function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** タスクの新規作成・詳細表示/編集・削除を行うモーダル */
export default function TaskModal({ initial, defaultStatus, author, onClose, onSave, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState(toLocalInput(initial?.due_date ?? null));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Esc で閉じる
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        status: initial?.status ?? defaultStatus,
        due_date: fromLocalInput(dueDate),
      });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const isEdit = initial !== null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="pixel-panel w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brick-bg flex items-start justify-between gap-4 border-b-4 border-mario-ink px-6 py-4">
          <h2 id="task-modal-title" className="text-lg font-black text-white [text-shadow:3px_3px_0_#101010]">
            {isEdit ? "タスクの詳細" : "新規タスク"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="border-2 border-mario-ink bg-white p-0.5 hover:bg-mario-coin"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="task-title" className="pixel-label mb-1 block">
              タイトル <span className="text-mario-brick">*</span>
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="pixel-input"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="pixel-label mb-1 block">
              詳細
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="pixel-input resize-y"
            />
          </div>

          <div>
            <label htmlFor="task-due" className="pixel-label mb-1 block">
              期限
            </label>
            <div className="flex items-center gap-2">
              <input
                id="task-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pixel-input flex-1"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="pixel-btn px-2 py-2 text-xs"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {isEdit && author && <p className="text-xs font-bold text-slate-600">作成者: {author}</p>}

          {error && (
            <p role="alert" className="border-4 border-mario-ink bg-mario-brick px-3 py-2 text-sm font-bold text-white">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="pixel-btn pixel-btn-danger"
              >
                <Trash2 size={16} aria-hidden />
                削除
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="pixel-btn"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="pixel-btn pixel-btn-pipe"
              >
                {submitting ? "保存中…" : isEdit ? "保存" : "作成"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
