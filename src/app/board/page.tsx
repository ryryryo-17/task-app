"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import { errorMessage } from "@/lib/board-utils";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";
import type { Board, Role } from "@/lib/types";

export default function BoardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<{ board: Board; role: Role } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 保護ルート：未認証ならログイン画面へ
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // 単一ボード：所属ボードが無ければ作成（オーナーとして）
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .getBoardForUser(user.id)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p role="alert" className="pixel-panel max-w-sm p-4 text-sm font-bold">
          {error}
        </p>
      </main>
    );
  }

  if (loading || !user || !info) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="pixel-title text-sm">読み込み中…</p>
      </main>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen pb-20">
      <Header
        boardTitle={info.board.title}
        boardId={info.board.id}
        email={user.email}
        role={info.role}
        onSignOut={handleSignOut}
      />
      <KanbanBoard boardId={info.board.id} currentUserId={user.id} />
    </main>
  );
}
