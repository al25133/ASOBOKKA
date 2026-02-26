"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function GroupCreate() {
	const router = useRouter();
	const supabase = getSupabaseClient();
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			const { data } = await supabase.auth.getUser();
			if (!data.user) {
				router.replace("/login");
			}
		};
		void load();
	}, [router, supabase.auth]);

	const createGroup = async () => {
		setLoading(true);
		setMessage(null);
		const { data, error } = await supabase.rpc("create_group_with_unique_passcode");
		setLoading(false);
		if (error || !data?.[0]) {
			setMessage(error?.message ?? "グループ作成に失敗しました。");
			return;
		}
		router.push(`/groups/${data[0].passcode}`);
	};

	return (
		<main className="mx-auto min-h-screen w-full max-w-md p-6">
			<Header title="グループ作成" description="重複しない5桁の合言葉を発行します。" />

			<section className="space-y-3 rounded-2xl border border-zinc-200 p-5">
				<p className="text-sm text-zinc-700">作成すると自動でルームに入室します。</p>
				<Button onClick={createGroup} disabled={loading}>
					{loading ? "作成中..." : "新しいグループを作成"}
				</Button>
				{message ? <p className="text-sm text-red-600">{message}</p> : null}
			</section>

			<p className="mt-4 text-sm text-zinc-600">
				既存グループに入る場合は <Link className="underline" href="/groups/search">グループ検索</Link>
			</p>
		</main>
	);
}
