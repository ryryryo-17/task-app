-- 0003: 1ユーザー1ボードの保証と、Realtime での削除通知
--  1. ボードの取得・作成を1つの関数にまとめ、ユーザー単位のロックで同時実行を直列化する
--  2. tasks の削除も Realtime で届くようにする

-- 1. ボードの取得・作成 -----------------------------------------------------
-- 所属ボードがあればその ID を返し、なければ「マイボード」を作って ID を返す。
-- 同じユーザーの呼び出しは、ロックで順番待ちになるため、ボードが二重に作られない。
CREATE OR REPLACE FUNCTION public.get_or_create_board()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_board_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;

  -- このトランザクションの間、同じユーザーの他の呼び出しを待たせる
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT bm.board_id INTO v_board_id
  FROM public.board_members bm
  WHERE bm.user_id = v_uid
  ORDER BY bm.joined_at DESC
  LIMIT 1;

  IF v_board_id IS NULL THEN
    -- オーナー行は on_board_created トリガーが同じトランザクションで作る
    INSERT INTO public.boards (title, owner_id)
    VALUES ('マイボード', v_uid)
    RETURNING id INTO v_board_id;
  END IF;

  RETURN v_board_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_board() TO authenticated;

-- 2. Realtime の削除通知 ----------------------------------------------------
-- 既定の設定では、DELETE のイベントに board_id が含まれず、
-- ボードで絞り込んだ購読に届かないことがあるため、削除前の行を全部含める
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
