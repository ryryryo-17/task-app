import type { ReactNode } from "react";
import {
  BowserCastle,
  GOOMBA,
  GOOMBA_PALETTE,
  Hill,
  MARIO_PALETTE,
  MARIO_RUN_A,
  MARIO_RUN_B,
  MUSHROOM,
  MUSHROOM_1UP_PALETTE,
  MUSHROOM_PALETTE,
  PipeSprite,
  PixelSprite,
} from "@/components/sprites";

/** 背景1周分の幅。globals.css の scenery-scroll の移動量と合わせる */
const HALF_WIDTH = 2400;

function Item({ left, children }: { left: number; children: ReactNode }) {
  return (
    <div className="absolute bottom-0" style={{ left }}>
      {children}
    </div>
  );
}

function Half() {
  return (
    <div className="relative h-full shrink-0" style={{ width: HALF_WIDTH }}>
      <Item left={60}>
        <Hill width={220} />
      </Item>
      <Item left={340}>
        <PixelSprite rows={MUSHROOM} palette={MUSHROOM_PALETTE} px={4} />
      </Item>
      <Item left={520}>
        <PipeSprite width={64} />
      </Item>
      <Item left={700}>
        <PixelSprite rows={GOOMBA} palette={GOOMBA_PALETTE} px={4} />
      </Item>
      <Item left={900}>
        <Hill width={180} />
      </Item>
      <Item left={1180}>
        <PixelSprite rows={MUSHROOM} palette={MUSHROOM_1UP_PALETTE} px={4} />
      </Item>
      <Item left={1340}>
        <PipeSprite width={72} tall />
      </Item>
      <Item left={1560}>
        <PixelSprite rows={GOOMBA} palette={GOOMBA_PALETTE} px={4} />
      </Item>
      <Item left={1630}>
        <PixelSprite rows={GOOMBA} palette={GOOMBA_PALETTE} px={4} />
      </Item>
      <Item left={1900}>
        <BowserCastle width={260} />
      </Item>
    </div>
  );
}

/**
 * 背景レイヤー：左へ流れる景色（丘・キノコ・土管・クリボー・クッパ城）、
 * 地面、そして右へ走り続けるマリオ風キャラ。内容より後ろに固定表示する。
 */
export default function Scenery() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-12 z-0 h-72 overflow-hidden">
        <div className="fx-scenery flex h-full" style={{ width: HALF_WIDTH * 2 }}>
          <Half />
          <Half />
        </div>
      </div>

      {/* 地面：レンガ模様のブロック */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-12 border-t-4 border-mario-ink bg-mario-ground bg-[repeating-linear-gradient(90deg,transparent_0_30px,rgba(0,0,0,0.25)_30px_32px)]"
      />

      {/* 右へ走るマリオ（2コマを交互に切り替えて走って見せる） */}
      <div aria-hidden className="fx-mario-run pointer-events-none fixed bottom-12 left-0 z-[1]">
        <div className="relative h-[42px] w-[36px]">
          <PixelSprite rows={MARIO_RUN_A} palette={MARIO_PALETTE} className="fx-frame-a absolute left-0 top-0" />
          <PixelSprite rows={MARIO_RUN_B} palette={MARIO_PALETTE} className="fx-frame-b absolute left-0 top-0" />
        </div>
      </div>
    </>
  );
}
