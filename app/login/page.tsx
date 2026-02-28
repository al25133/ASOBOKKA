// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="pt-12 pb-8">
				<Link href="/" className="active:scale-95 transition-transform inline-block">
					<Image src="/loginlogo.svg" alt="あそぼっか ロゴ" width={180} height={90} priority className="object-contain" />
				</Link>
			</div>

			<div className="w-full max-w-112.5 bg-white rounded-t-[60px] grow px-10 pt-12 pb-12 shadow-2xl">
				<h1 className="text-[#5A7C55] text-center text-2xl font-bold mb-2">ログイン</h1>
				<p className="text-center text-sm text-[#6D8D69] mb-10">メールログインで開始できます。</p>

				<div className="space-y-8">
					<div className="space-y-2">
						<label className="text-sm font-bold text-[#5A7C55] ml-2">ログインID</label>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="メールアドレス（半角英数字）"
							className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-bold text-[#5A7C55] ml-2">パスワード</label>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="半角英数字"
							className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]"
						/>
					</div>

					<div className="pt-2 space-y-3">
						<button
							type="button"
							onClick={loginWithEmail}
							disabled={loading || !email || !password}
							className="w-full bg-[#52A399] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
						>
							{loading ? "ログイン中..." : "ログイン"}
						</button>
					</div>

					{message ? <p className="text-center text-sm text-red-600">{message}</p> : null}

					<p className="text-center text-sm text-[#6D8D69]">
						アカウントをお持ちでない場合は <Link className="underline font-semibold" href="/register">新規登録</Link>
					</p>
				</div>
			</div>
		</main>
	);
}
