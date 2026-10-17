"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/board-utils";

interface AuthFormProps {
  mode: "login" | "signup";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }: AuthFormProps) {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ログイン済みならボードへ
  useEffect(() => {
    if (!loading && user) router.replace("/board");
  }, [loading, user, router]);

  function redirectAfterAuth() {
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") ? next : "/board");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_PATTERN.test(email)) {
      setError("メールアドレスの形式が正しくありません");
      return;
    }
    if (isSignup) {
      if (password.length < 8) {
        setError("パスワードは8文字以上で入力してください");
        return;
      }
      if (password !== confirm) {
        setError("パスワードが一致しません");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isSignup) await signUp(email, password);
      else await signIn(email, password);
      redirectAfterAuth();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 pb-20">
      <div className="pixel-panel w-full max-w-sm">
        <div className="brick-bg border-b-4 border-mario-ink px-6 py-5 text-center">
          <p className="pixel-title text-xs">TASK WORLD</p>
          <h1 className="mt-2 text-2xl font-black text-white [text-shadow:3px_3px_0_#101010]">
            {isSignup ? "新規登録" : "ログイン"}
          </h1>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field
              id="email"
              label="メールアドレス"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              id="password"
              label="パスワード"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
              hint={isSignup ? "8文字以上" : undefined}
            />
            {isSignup && (
              <Field
                id="confirm"
                label="パスワード（確認）"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
              />
            )}

            {error && (
              <p role="alert" className="border-4 border-mario-ink bg-mario-brick px-3 py-2 text-sm font-bold text-white">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="pixel-btn pixel-btn-coin w-full py-3 text-base">
              {submitting ? "処理中…" : isSignup ? "登録する" : "スタート！"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-bold">
            {isSignup ? (
              <>
                すでにアカウントをお持ちですか？{" "}
                <Link href="/login" className="underline decoration-4 underline-offset-4 hover:text-mario-brick">
                  ログイン
                </Link>
              </>
            ) : (
              <>
                アカウントをお持ちでない方は{" "}
                <Link href="/signup" className="underline decoration-4 underline-offset-4 hover:text-mario-brick">
                  新規登録
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

function Field({ id, label, value, onChange, type = "text", autoComplete, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="pixel-label mb-1 flex items-baseline justify-between">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-slate-600">{hint}</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pixel-input"
      />
    </div>
  );
}
