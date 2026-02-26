"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/ui/header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberChoice = {
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
};

function aggregate(items: Array<string | null>) {
	return items.reduce<Record<string, number>>((acc, item) => {
		if (!item) {
			return acc;
		}
		acc[item] = (acc[item] ?? 0) + 1;
		return acc;
	}, {});
}

export default function GroupResult() {
	const params = useParams<{ id: string }>();
	const passcode = params.id;
	const [loading, setLoading] = useState(true);
	const [choices, setChoices] = useState<MemberChoice[]>([]);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			const supabase = getSupabaseClient();
			const { data: groupData, error: groupError } = await supabase.rpc("find_group_by_passcode", {
				input_passcode: passcode,
			});

			if (groupError || !groupData?.[0]) {
				setMessage("グループ情報を取得できませんでした。");
				setLoading(false);
				return;
			}

			const { data, error } = await supabase
				.from("group_members")
				.select("selected_area, selected_purpose, selected_value")
				.eq("group_id", groupData[0].group_id);

			setLoading(false);
			if (error) {
				setMessage(error.message);
				return;
			}
			setChoices(data ?? []);
		};

		void load();
	}, [passcode]);

	const areaStats = useMemo(() => aggregate(choices.map((choice) => choice.selected_area)), [choices]);
	const purposeStats = useMemo(() => aggregate(choices.map((choice) => choice.selected_purpose)), [choices]);
	const valueStats = useMemo(() => aggregate(choices.map((choice) => choice.selected_value)), [choices]);

	if (loading) {
		return <main className="mx-auto min-h-screen w-full max-w-2xl p-6">読み込み中...</main>;
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-2xl p-6">
			<Header title={`結果 ${passcode}`} description="メンバーの選択集計です。" />
			{message ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}

			<div className="space-y-4">
				<section className="rounded-2xl border border-zinc-200 p-5">
					<h2 className="mb-2 font-semibold">エリア</h2>
					<ul className="space-y-1 text-sm text-zinc-700">
						{Object.entries(areaStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
				</section>

				<section className="rounded-2xl border border-zinc-200 p-5">
					<h2 className="mb-2 font-semibold">目的</h2>
					<ul className="space-y-1 text-sm text-zinc-700">
						{Object.entries(purposeStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
				</section>

				<section className="rounded-2xl border border-zinc-200 p-5">
					<h2 className="mb-2 font-semibold">価値観</h2>
					<ul className="space-y-1 text-sm text-zinc-700">
						{Object.entries(valueStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
				</section>
			</div>

			<p className="mt-6 text-sm text-zinc-600">
				<Link href="/groups/search" className="underline">別のグループを検索</Link>
			</p>
		</main>
	);
}
