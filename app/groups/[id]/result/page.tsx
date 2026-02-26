// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="pt-8 pb-5">
				<Link href="/groups" className="active:scale-95 transition-transform inline-block">
					<Image src="/loginlogo.svg" alt="あそぼっか ロゴ" width={150} height={75} priority className="object-contain" />
				</Link>
			</div>

			<div className="w-full max-w-112.5 bg-white rounded-t-[60px] grow px-8 pt-10 pb-16 shadow-2xl">
				<h1 className="text-[#5A7C55] text-center text-2xl font-bold mb-2">結果 {passcode}</h1>
				<p className="text-center text-sm text-[#6D8D69] mb-8">メンバーの選択集計です。</p>
				{message ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{message}</p> : null}

				<div className="space-y-4">
					<section className="rounded-[30px] border border-[#389E95]/20 p-5 bg-[#F9FBF9]">
						<h2 className="mb-2 font-bold text-[#5A7C55]">エリア</h2>
						<ul className="space-y-1 text-sm text-[#5A5A5A]">
						{Object.entries(areaStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
				</section>

					<section className="rounded-[30px] border border-[#389E95]/20 p-5 bg-[#F9FBF9]">
						<h2 className="mb-2 font-bold text-[#5A7C55]">目的</h2>
						<ul className="space-y-1 text-sm text-[#5A5A5A]">
						{Object.entries(purposeStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
				</section>

					<section className="rounded-[30px] border border-[#389E95]/20 p-5 bg-[#F9FBF9]">
						<h2 className="mb-2 font-bold text-[#5A7C55]">価値観</h2>
						<ul className="space-y-1 text-sm text-[#5A5A5A]">
						{Object.entries(valueStats).map(([label, count]) => (
							<li key={label}>{label}: {count}票</li>
						))}
					</ul>
					</section>
				</div>

				<p className="mt-6 text-sm text-center text-[#6D8D69]">
					<Link href="/groups/search" className="underline font-semibold">別のグループを検索</Link>
				</p>
			</div>
		</main>
	);
}
