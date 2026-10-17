-- 0002: 初期スキーマ（手動実行分）の修正
--  1. status の値をアプリの Status 型（todo / in_progress / done）に合わせる
--  2. RLS の自己参照による無限再帰を、SECURITY DEFINER 関数で回避する
--  3. メンバー参加を招待トークンで行う関数と、招待トークンをオーナーだけが取得する関数を追加する

-- 1. status enum の作り直し ------------------------------------------------
ALTER TYPE public.task_status RENAME TO task_status_old;
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

ALTER TABLE public.tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.tasks
  ALTER COLUMN status TYPE public.task_status
  USING (CASE status::text WHEN 'completed' THEN 'done' ELSE status::text END)::public.task_status;
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'in_progress';

DROP TYPE public.task_status_old;

-- 2. 既存ポリシーを全部外して作り直す ----------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ポリシー内から board_members を直接参照すると、そのポリシー自身が再帰的に評価される。
-- SECURITY DEFINER の関数に任せることで RLS を経由せずに判定する。
CREATE OR REPLACE FUNCTION public.is_board_member(p_board_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = p_board_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_board_owner(p_board_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = p_board_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- profiles：同じボードに所属する人と自分だけ読める（メールアドレスの全公開を防ぐ）
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members b
      WHERE b.user_id = profiles.id AND public.is_board_member(b.board_id)
    )
  );
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- boards
CREATE POLICY boards_select ON public.boards FOR SELECT TO authenticated
  USING (public.is_board_member(id));
CREATE POLICY boards_insert ON public.boards FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY boards_update ON public.boards FOR UPDATE TO authenticated
  USING (public.is_board_owner(id)) WITH CHECK (public.is_board_owner(id));
CREATE POLICY boards_delete ON public.boards FOR DELETE TO authenticated
  USING (public.is_board_owner(id));

-- board_members：読み取りのみ。追加は trigger と join_board_by_token だけが行う
CREATE POLICY board_members_select ON public.board_members FOR SELECT TO authenticated
  USING (public.is_board_member(board_id));

-- tasks：参加メンバーは全操作可能（要件 3.2 のメンバー権限）
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (public.is_board_member(board_id));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_board_member(board_id));
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_board_member(board_id)) WITH CHECK (public.is_board_member(board_id));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (public.is_board_member(board_id));

-- 3. 招待関連の関数 -----------------------------------------------------------

-- 招待トークンでボードに参加する（未参加なら member として追加）
CREATE OR REPLACE FUNCTION public.join_board_by_token(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;

  SELECT id INTO v_board_id FROM public.boards WHERE invite_token = p_token;
  IF v_board_id IS NULL THEN
    RAISE EXCEPTION '招待リンクが無効です';
  END IF;

  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (v_board_id, auth.uid(), 'member')
  ON CONFLICT (board_id, user_id) DO NOTHING;

  RETURN v_board_id;
END;
$$;

-- 招待トークンの取得（オーナーのみ。それ以外は NULL）
CREATE OR REPLACE FUNCTION public.get_invite_token(p_board_id uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT invite_token FROM public.boards
  WHERE id = p_board_id AND public.is_board_owner(p_board_id);
$$;

-- 関数の実行権限：ログイン済みユーザーのみ
REVOKE EXECUTE ON FUNCTION public.join_board_by_token(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invite_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_board_by_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_token(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_board_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_board_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_board_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_board_owner(uuid) TO authenticated;
