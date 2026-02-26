"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function Register() {
	const router = useRouter();
	const supabase = getSupabaseClient();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const register = async () => {
		setLoading(true);
		setMessage(null);
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/home` : undefined,
			},
		});
		setLoading(false);
		if (error) {
			setMessage(error.message);
			return;
		}
		setMessage("登録処理を実行しました。確認メールが必要な設定の場合はメールを確認してください。");
		router.push("/login");
	};

	return (
		<main className="mx-auto min-h-screen w-full max-w-md p-6">
			<Header title="新規登録" description="メールアドレスとパスワードで登録します。" />

			<section className="space-y-3 rounded-2xl border border-zinc-200 p-5">
				<Input
					type="email"
					placeholder="メールアドレス"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<Input
					type="password"
					placeholder="パスワード（6文字以上）"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<Button onClick={register} disabled={loading || !email || password.length < 6}>
					{loading ? "登録中..." : "登録する"}
				</Button>
				{message ? <p className="text-sm text-zinc-700">{message}</p> : null}
			</section>

			<p className="mt-4 text-sm text-zinc-600">
				すでに登録済みの場合は <Link className="underline" href="/login">ログイン</Link>
			</p>
		</main>
	);
}
