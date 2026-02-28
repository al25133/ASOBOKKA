"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

const purposeOptions = [
	{ id: 1, title: "ショッピング", sub: "宝探ししたい", fileName: "shopping.svg" },
	{ id: 2, title: "ハンドメイド", sub: "ものづくりしたい", fileName: "handmade.svg" },
	{ id: 3, title: "カフェ", sub: "ゆっくり語りたい", fileName: "cafe.svg" },
	{ id: 4, title: "ミュージアム", sub: "静かに刺激を受けたい", fileName: "museum.svg" },
	{ id: 5, title: "観光", sub: "ちょっと冒険したい", fileName: "sightseeing.svg" },
	{ id: 6, title: "食事", sub: "がっつり満たされたい", fileName: "meal.svg" },
	{ id: 7, title: "エンタメ・文化", sub: "自由に楽しみたい", fileName: "entartainment.svg" },
	{ id: 8, title: "アウトドア", sub: "体を動かしたい", fileName: "outdoor.svg" },
];

function PurposeSelectionContent({ passcode }: { passcode: string }) {
	const router = useRouter();

	const [selectedPurposeId, setSelectedPurposeId] = useState<number | null>(null);
	const [selectedPurpose, setSelectedPurpose] = useState("");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [initializing, setInitializing] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const initialize = async () => {
			const supabase = getSupabaseClient();
			const [{ data: authData }, joinResult] = await Promise.all([
				supabase.auth.getUser(),
				supabase.rpc("join_group_by_passcode", { input_passcode: passcode }),
			]);

			if (!authData.user) {
				router.replace("/login");
				return;
			}

			if (joinResult.error || !joinResult.data) {
				setMessage("グループが見つかりませんでした。");
				setInitializing(false);
				return;
			}

			setGroupId(joinResult.data);
			setUserId(authData.user.id);

			const { data: memberData } = await supabase
				.from("group_members")
				.select("selected_purpose")
				.eq("group_id", joinResult.data)
				.eq("user_id", authData.user.id)
				.maybeSingle<{ selected_purpose: string | null }>();

			if (memberData?.selected_purpose) {
				setSelectedPurpose(memberData.selected_purpose);
				const matched = purposeOptions.find((purpose) => purpose.title === memberData.selected_purpose);
				if (matched) {
					setSelectedPurposeId(matched.id);
				}
			}

			setInitializing(false);
		};

		void initialize();
	}, [passcode, router]);

	const savePurpose = async (nextPurpose: string) => {
		if (!groupId || !userId) {
			return;
		}

		setSaving(true);
		setMessage(null);
		const supabase = getSupabaseClient();
		const { error } = await supabase.from("group_members").upsert(
			{
				group_id: groupId,
				user_id: userId,
				selected_purpose: nextPurpose,
				is_ready: false,
			},
			{ onConflict: "group_id,user_id" },
		);

		setSaving(false);
		if (error) {
			setMessage("目的の保存に失敗しました。もう一度お試しください。");
		}
	};

	if (initializing) {
		return <div className="pt-20 text-[#389E95] font-bold text-center">準備中...</div>;
	}

	return (
		<div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-12 px-6 min-h-[calc(100vh-100px)] select-none">
			<div className="w-full flex justify-between items-center mb-10 px-4 relative shrink-0">
				<div className="absolute top-1/2 left-0 w-full h-0.5 bg-white z-0 -translate-y-1/2 opacity-50"></div>
				{["ホーム", "場所", "目的", "条件"].map((label, i) => (
					<div key={label} className="relative z-10 flex flex-col items-center gap-1">
						{i === 2 && (
							<div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
								<Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
							</div>
						)}
						<div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 2 ? "bg-[#389E95] border-[#389E95] scale-110 shadow-md" : "bg-white border-[#389E95]/30"}`}></div>
						<span className={`text-[10px] font-black ${i <= 2 ? "text-[#389E95]" : "text-[#389E95]/40"}`}>{label}</span>
					</div>
				))}
			</div>

			<div className="grid grid-cols-2 gap-3 w-full pb-32">
				{purposeOptions.map((p) => (
					<div
						key={p.id}
						onClick={() => {
							setSelectedPurposeId(p.id);
							setSelectedPurpose(p.title);
							void savePurpose(p.title);
						}}
						className="relative h-40 rounded-[25px] overflow-hidden shadow-md active:scale-95 bg-white"
					>
						<div className="absolute inset-0">
							<Image src={`/purpose/${p.fileName}`} alt={p.title} fill className="object-cover" />
						</div>
						<div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
						<div className="absolute bottom-4 left-4 right-4 text-white">
							<p className="text-sm font-black">{p.title}</p>
							<p className="text-[8px] font-bold">{p.sub}</p>
						</div>
						<div className="absolute bottom-4 right-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill={selectedPurposeId === p.id ? "#FF5A5F" : "none"}
								viewBox="0 0 24 24"
								strokeWidth={2.5}
								stroke={selectedPurposeId === p.id ? "#FF5A5F" : "white"}
								className="w-5 h-5 transition-colors drop-shadow-md"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
								/>
							</svg>
						</div>
					</div>
				))}
			</div>
			{message ? <p className="w-full mt-3 text-sm text-[#5A5A5A] text-center">{message}</p> : null}

			<div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto">
				<Link href={`/groups/${passcode}/area`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
					<span className="text-[#389E95] font-black tracking-widest text-sm">戻る</span>
				</Link>
				<Link
					href={selectedPurpose ? `/groups/${passcode}/condition` : "#"}
					className={`flex-1 bg-white rounded-2xl py-3 text-center transition-all ${!selectedPurpose || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95"}`}
				>
					<span className="text-[#389E95] font-black tracking-widest text-sm">次へ</span>
				</Link>
			</div>
			<div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
		</div>
	);
}

function PurposePageContent() {
	const params = useParams<{ id: string }>();

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden select-none">
			<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />
			<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={params.id} />} />
			<PurposeSelectionContent passcode={params.id} />
		</main>
	);
}

export default function GroupPurposePage() {
	return (
		<Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
			<PurposePageContent />
		</Suspense>
	);
}