"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { PasscodeInput } from "@/components/ui/passcode-input";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function GroupSearch() {
	const router = useRouter();
	const supabase = getSupabaseClient();
	const [passcode, setPasscode] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const search = async () => {
		if (passcode.length !== 5) {
			setMessage("5桁の数字を入力してください。");
			return;
		}

		setLoading(true);
		setMessage(null);
		const { data, error } = await supabase.rpc("find_group_by_passcode", { input_passcode: passcode });
		setLoading(false);
		if (error || !data?.[0]) {
			setMessage("合言葉が見つかりませんでした。");
			return;
		}
		router.push(`/groups/${passcode}`);
	};

	return (
		<main className="mx-auto min-h-screen w-full max-w-md p-6">
			<Header title="グループ検索" description="5桁の合言葉を入力してください。" />

			<section className="space-y-4 rounded-2xl border border-zinc-200 p-5">
				<PasscodeInput value={passcode} onChange={setPasscode} />
				<Button onClick={search} disabled={loading || passcode.length !== 5}>
					{loading ? "確認中..." : "グループに入る"}
				</Button>
				{message ? <p className="text-sm text-red-600">{message}</p> : null}
			</section>

			<p className="mt-4 text-sm text-zinc-600">
				新しく作る場合は <Link className="underline" href="/groups/create">グループ作成</Link>
			</p>
		</main>
	);
}
