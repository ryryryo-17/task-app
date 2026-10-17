import type { CSSProperties } from "react";

type Palette = Record<string, string>;

interface PixelSpriteProps {
  rows: string[];
  palette: Palette;
  /** 1ドットあたりの表示ピクセル数 */
  px?: number;
  className?: string;
  style?: CSSProperties;
}

/** 文字列マップ（"." は透明）からドット絵を描く */
export function PixelSprite({ rows, palette, px = 3, className, style }: PixelSpriteProps) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * px}
      height={h * px}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
      style={style}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          palette[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[c]} /> : null,
        ),
      )}
    </svg>
  );
}

// ---- マリオ風キャラ（12x14）。R=赤 S=肌 B=茶 U=青 Y=黄 ----

export const MARIO_PALETTE: Palette = {
  R: "#e52521",
  S: "#f8b878",
  B: "#6b3a10",
  U: "#2038ec",
  Y: "#fbd000",
};

const MARIO_UPPER = [
  "...RRRRR....",
  "..RRRRRRRRR.",
  "..BBBSSBS...",
  ".BSBSSSBSSS.",
  ".BSBBSSSBSSS",
  ".BBSSSSBBBB.",
  "...SSSSSSS..",
  "..RRRURRUR..",
  ".RRRRUUUURRR",
  ".SSRUYUUYUSS",
  ".SSUUUUUUUUS",
  "..UUUUUUUU..",
];

export const MARIO_STAND = [...MARIO_UPPER, "..UUU..UUU..", ".BBB....BBB."];
export const MARIO_RUN_A = [...MARIO_UPPER, ".UUU....UU..", "BBB.....BBB."];
export const MARIO_RUN_B = [...MARIO_UPPER, "...UUUUUU...", "...BBBBBB..."];

// ---- キノコ（12x12）。R=傘 W=白 K=目 S=軸 ----

export const MUSHROOM_PALETTE: Palette = { R: "#e52521", W: "#ffffff", K: "#101010", S: "#f8d8b0" };
export const MUSHROOM_1UP_PALETTE: Palette = { ...MUSHROOM_PALETTE, R: "#00a800" };

export const MUSHROOM = [
  "....RRRR....",
  "..RRWWRRRR..",
  ".RRWWWWRRRR.",
  ".RWWWWRRWWR.",
  "RRWWWWRRWWRR",
  "RRRWWRRRRRRR",
  "RRRRRRRRRRRR",
  "..SSSSSSSS..",
  "..SKSSSSKS..",
  "..SKSSSSKS..",
  "..SSSSSSSS..",
  "...SSSSSS...",
];

// ---- クリボー風の敵（12x12） ----

export const GOOMBA_PALETTE: Palette = { B: "#a0522d", W: "#ffffff", K: "#101010", S: "#f8d8b0" };

export const GOOMBA = [
  "....BBBB....",
  "..BBBBBBBB..",
  ".BBBBBBBBBB.",
  ".BWKBBBBKWB.",
  "BBWWKBBKWWBB",
  "BBBBBBBBBBBB",
  ".BBBBBBBBBB.",
  "...SSSSSS...",
  "..SSSSSSSS..",
  "..SSSSSSSS..",
  ".KKK....KKK.",
  "KKKK....KKKK",
];

// ---- 背景の大物（SVG） ----

/** クッパ城：灰色の城壁にとがった赤黒い屋根と旗 */
export function BowserCastle({ width = 240 }: { width?: number }) {
  return (
    <svg viewBox="-4 -24 128 128" width={width} height={width} shapeRendering="crispEdges" aria-hidden>
      {/* 旗 */}
      <rect x="14" y="-20" width="3" height="18" fill="#101010" />
      <rect x="17" y="-20" width="18" height="10" fill="#e52521" stroke="#101010" strokeWidth="2" />
      <rect x="23" y="-17" width="6" height="4" fill="#fbd000" />
      {/* 塔と屋根 */}
      <rect x="0" y="20" width="30" height="80" fill="#6e6e6e" stroke="#101010" strokeWidth="3" />
      <rect x="90" y="20" width="30" height="80" fill="#6e6e6e" stroke="#101010" strokeWidth="3" />
      <polygon points="-2,20 15,-4 32,20" fill="#7a1f0a" stroke="#101010" strokeWidth="3" />
      <polygon points="88,20 105,-4 122,20" fill="#7a1f0a" stroke="#101010" strokeWidth="3" />
      {/* 本丸 */}
      <rect x="24" y="40" width="72" height="60" fill="#8a8a8a" stroke="#101010" strokeWidth="3" />
      {[26, 44, 62, 80].map((x) => (
        <rect key={x} x={x} y="32" width="12" height="8" fill="#8a8a8a" stroke="#101010" strokeWidth="2" />
      ))}
      {/* レンガの目地 */}
      <path d="M0 50H120M0 70H120M0 90H120" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
      {/* 窓と扉 */}
      <rect x="8" y="40" width="8" height="12" fill="#fbd000" stroke="#101010" strokeWidth="2" />
      <rect x="104" y="40" width="8" height="12" fill="#fbd000" stroke="#101010" strokeWidth="2" />
      <rect x="34" y="52" width="8" height="12" fill="#fbd000" stroke="#101010" strokeWidth="2" />
      <rect x="78" y="52" width="8" height="12" fill="#fbd000" stroke="#101010" strokeWidth="2" />
      <rect x="50" y="62" width="20" height="38" rx="10" fill="#101010" />
    </svg>
  );
}

/** 緑の丘（目付き） */
export function Hill({ width = 220 }: { width?: number }) {
  return (
    <svg viewBox="0 0 110 55" width={width} height={width / 2} shapeRendering="crispEdges" aria-hidden>
      <path
        d="M4 55 C4 20 30 4 55 4 C80 4 106 20 106 55 Z"
        fill="#00a800"
        stroke="#101010"
        strokeWidth="3"
      />
      <rect x="40" y="20" width="5" height="12" fill="#101010" />
      <rect x="62" y="20" width="5" height="12" fill="#101010" />
    </svg>
  );
}

/** 土管 */
export function PipeSprite({ width = 64, tall = false }: { width?: number; tall?: boolean }) {
  const h = tall ? 80 : 50;
  return (
    <svg viewBox={`0 0 40 ${h}`} width={width} height={(width * h) / 40} shapeRendering="crispEdges" aria-hidden>
      <rect x="1.5" y="1.5" width="37" height="13" fill="#00a800" stroke="#101010" strokeWidth="3" />
      <rect x="5.5" y="15.5" width="29" height={h - 17} fill="#00a800" stroke="#101010" strokeWidth="3" />
      <rect x="9" y="19" width="5" height={h - 24} fill="#7bff7b" opacity="0.6" />
      <rect x="6" y="4" width="4" height="8" fill="#7bff7b" opacity="0.6" />
    </svg>
  );
}
