import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用の Supabase クライアント。
 * 接続先は .env.local の NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。
 * anon キーはフロントエンドに公開される前提の値で、権限は RLS で制限する。
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase の接続情報が未設定です（.env.local を確認してください）");
  }
  return createBrowserClient(url, anonKey);
}
