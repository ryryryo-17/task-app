import type { CSSProperties } from "react";
import { MARIO_PALETTE, MARIO_STAND, PixelSprite } from "@/components/sprites";

const FRAGMENTS = [
  { dx: -70, dy: -50, color: "#c84c0c" },
  { dx: -30, dy: -85, color: "#fbd000" },
  { dx: 30, dy: -85, color: "#c84c0c" },
  { dx: 70, dy: -50, color: "#fbd000" },
  { dx: -50, dy: -25, color: "#fbd000" },
  { dx: 50, dy: -25, color: "#c84c0c" },
];

/**
 * 完了時の演出：ブロックの下でジャンプ → 頭突きでブロックが砕け、破片とコインが飛ぶ。
 * タイミングは globals.css の .fx-* と対応（全体1秒、衝突は0.4秒時点）。
 */
export default function BreakEffect() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
      <div className="fx-mario absolute left-4 top-[calc(100%+26px)]">
        <PixelSprite rows={MARIO_STAND} palette={MARIO_PALETTE} px={3} />
      </div>

      {FRAGMENTS.map((f, i) => (
        <span
          key={i}
          className="fx-brick absolute left-1/2 top-1/2 -ml-2 -mt-2 h-4 w-4 border-2 border-mario-ink"
          style={{ "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, background: f.color } as CSSProperties}
        />
      ))}

      <span className="fx-coin absolute left-1/2 top-0 -ml-2 h-6 w-4 rounded-full border-2 border-mario-ink bg-mario-coin" />
    </div>
  );
}
