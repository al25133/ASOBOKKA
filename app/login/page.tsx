"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function Login() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const loginWithEmail = async () => {
		const supabase = getSupabaseClient();
		setLoading(true);
		setMessage(null);
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) {
			setLoading(false);
			setMessage(error.message);
			return;
		}

		const { data: userData } = await supabase.auth.getUser();
		if (!userData.user?.email_confirmed_at) {
			await supabase.auth.signOut();
			setLoading(false);
			setMessage("メール確認が完了していません。確認メールのリンクを開いてからログインしてください。");
			return;
		}

		setLoading(false);
		router.push("/");
	};

	const loginAnonymously = async () => {
		const supabase = getSupabaseClient();
		setLoading(true);
		setMessage(null);
		const { error } = await supabase.auth.signInAnonymously();
		setLoading(false);
		if (error) {
			setMessage(error.message);
			return;
		}
		router.push("/");
	};

	return (
		<main className="mx-auto min-h-screen w-full max-w-md p-6">
			<Header title="ログイン" description="メールログインまたは匿名ログインで開始できます。" />

			<section className="space-y-3 rounded-2xl border border-zinc-200 p-5">
				<Input
					type="email"
					placeholder="メールアドレス"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<Input
					type="password"
					placeholder="パスワード"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<Button onClick={loginWithEmail} disabled={loading || !email || !password}>
					{loading ? "ログイン中..." : "メールでログイン"}
				</Button>
				<Button variant="outline" onClick={loginAnonymously} disabled={loading}>
					匿名ログイン
				</Button>
				{message ? <p className="text-sm text-red-600">{message}</p> : null}
			</section>

			<p className="mt-4 text-sm text-zinc-600">
				アカウントをお持ちでない場合は <Link className="underline" href="/register">新規登録</Link>
			</p>
		</main>
	);
}
