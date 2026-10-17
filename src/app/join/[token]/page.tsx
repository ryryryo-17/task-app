"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    // 未ログインならログイン後に戻ってこられるよう next を付けて遷移
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
      return;
    }

    let cancelled = false;
    api
      .joinBoardByToken(token)
      .then(() => {
        if (!cancelled) router.replace("/board");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "参加に失敗しました");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-20">
      {error ? (
        <div className="pixel-panel max-w-sm p-6 text-center">
          <p role="alert" className="border-4 border-mario-ink bg-mario-brick px-4 py-3 text-sm font-bold text-white">
            {error}
          </p>
          <button type="button" onClick={() => router.replace("/board")} className="pixel-btn pixel-btn-coin mt-4">
            ボードへ戻る
          </button>
        </div>
      ) : (
        <p className="pixel-title text-sm">招待を確認しています…</p>
      )}
    </main>
  );
}
