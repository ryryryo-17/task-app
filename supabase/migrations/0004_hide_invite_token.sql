-- 0004: 招待トークンを、ログインユーザーから直接読めないようにする
-- 招待トークンはオーナーが get_invite_token() で取得する（0002 で作成済み）。
-- 直接の SELECT は、列を指定して許可し直すため、invite_token は含めない。

-- テーブル全体の読み取り権限を外し、必要な列だけを付け直す
REVOKE SELECT ON public.boards FROM authenticated, anon;
GRANT SELECT (id, title, owner_id, created_at) ON public.boards TO authenticated;
