"use client";

import { LayoutGrid, Link as LinkIcon, LogOut, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { isMuted, playCoin, setMuted } from "@/lib/sound";
import type { Role } from "@/lib/types";

interface HeaderProps {
  boardTitle: string;
  boardId: string;
  email: string;
  role: Role;
  onSignOut: () => void;
}

export default function Header({ boardTitle, boardId, email, role, onSignOut }: HeaderProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);

  // 保存済みのミュート設定を読む（SSR との不一致を避けるためマウント後に反映）
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playCoin(); // オンに戻したときの確認音
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copyInviteLink() {
    try {
      const token = await api.getInviteToken(boardId);
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setToast("招待リンクをコピーしました");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "招待リンクをコピーできませんでした");
    }
  }

  const isOwner = role === "owner";

  return (
    <>
      <header className="brick-bg sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b-4 border-mario-ink px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border-4 border-mario-ink bg-mario-coin shadow-block-sm">
            <LayoutGrid size={18} aria-hidden />
          </div>
          <h1 className="pixel-title text-base">{boardTitle}</h1>
          <span className="border-2 border-mario-ink bg-mario-coin px-2 py-0.5 text-xs font-bold">
            {isOwner ? "オーナー" : "メンバー"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden max-w-[180px] truncate text-sm font-bold text-white [text-shadow:2px_2px_0_#101010] md:inline">
            {email}
          </span>
          <button
            type="button"
            onClick={copyInviteLink}
            disabled={!isOwner}
            title={isOwner ? "招待リンクをコピー" : "オーナーのみ利用できます"}
            className="pixel-btn pixel-btn-coin"
          >
            <LinkIcon size={16} aria-hidden />
            招待リンク
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "効果音をオンにする" : "効果音をオフにする"}
            title={muted ? "効果音: オフ" : "効果音: オン"}
            className="pixel-btn px-2"
          >
            {muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
          </button>
          <button type="button" onClick={onSignOut} className="pixel-btn">
            <LogOut size={16} aria-hidden />
            ログアウト
          </button>
        </div>
      </header>

      {toast && (
        <div role="status" className="pixel-panel fixed bottom-20 right-4 z-50 bg-mario-coin px-4 py-2 text-sm font-bold">
          {toast}
        </div>
      )}
    </>
  );
}
