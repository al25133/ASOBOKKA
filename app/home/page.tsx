import Link from "next/link";
import { Header } from "@/components/ui/header";

export default function Home() {
	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl p-6">
			<Header title="ホーム" description="作成または検索からグループに参加できます。" />
			<div className="grid gap-3 sm:grid-cols-2">
				<Link href="/groups/create" className="rounded-2xl border border-zinc-200 p-5 hover:bg-zinc-50">
					<h2 className="font-semibold">グループ作成</h2>
					<p className="text-sm text-zinc-600">重複しない5桁の合言葉を発行します。</p>
				</Link>
				<Link href="/groups/search" className="rounded-2xl border border-zinc-200 p-5 hover:bg-zinc-50">
					<h2 className="font-semibold">グループ検索</h2>
					<p className="text-sm text-zinc-600">5桁の合言葉を入力して参加します。</p>
				</Link>
			</div>
		</main>
	);
}
