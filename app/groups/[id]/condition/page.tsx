"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type ConditionState = {
	end: number;
	stance: number;
	owd: number;
	me: number;
	dget: number;
};

type ParsedCondition = {
	spendingStyle: string | null;
	distance: string | null;
	crowd: string | null;
	time: string | null;
	budget: number | null;
};

const spendingScale = ["のんびり", "ゆったり", "おまかせ", "食べ歩き", "アクティブ"];
const distanceScale = ["徒歩圏", "電車1駅", "電車2〜3駅", "30分以内", "どこでも"];
const crowdScale = ["とても少なめ", "少なめ", "ふつう", "にぎやか", "とてもにぎやか"];
const timeScale = ["1時間以内", "2時間くらい", "3時間くらい", "半日", "終日"];

function parseCondition(raw: string | null): ParsedCondition {
	if (!raw) {
		return {
			spendingStyle: null,
			distance: null,
			crowd: null,
			time: null,
			budget: null,
		};
	}

	const getPart = (key: string) => {
		const match = raw.match(new RegExp(`${key}:([^/]+)`));
		return match?.[1]?.trim() ?? null;
	};

	return {
		spendingStyle: getPart("過ごし方"),
		distance: getPart("距離"),
		crowd: getPart("人の多さ"),
		time: getPart("時間"),
		budget: (() => {
			const budgetRaw = getPart("予算");
			if (!budgetRaw) {
				return null;
			}
			const normalized = Number(budgetRaw.replace(/[^0-9]/g, ""));
			return Number.isFinite(normalized) ? normalized : null;
		})(),
	};
}

function indexFromScale(scale: string[], value: string | null) {
	if (!value) {
		return 3;
	}
	const index = scale.findIndex((item) => item === value);
	return index >= 0 ? index + 1 : 3;
}

function ConditionSelectionContent({ passcode }: { passcode: string }) {
	const router = useRouter();
	const [groupId, setGroupId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [initializing, setInitializing] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [selections, setSelections] = useState<ConditionState>({
		end: 3,
		stance: 3,
		owd: 3,
		me: 3,
		dget: 3000,
	});

	const conditionValue = useMemo(
		() =>
			`過ごし方:${spendingScale[selections.end - 1]} / 距離:${distanceScale[selections.stance - 1]} / 人の多さ:${crowdScale[selections.owd - 1]} / 時間:${timeScale[selections.me - 1]} / 予算:${selections.dget}円`,
		[selections],
	);

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
				.select("selected_value")
				.eq("group_id", joinResult.data)
				.eq("user_id", authData.user.id)
				.maybeSingle<{ selected_value: string | null }>();

			const parsed = parseCondition(memberData?.selected_value ?? null);
			setSelections((prev) => ({
				...prev,
				end: indexFromScale(spendingScale, parsed.spendingStyle),
				stance: indexFromScale(distanceScale, parsed.distance),
				owd: indexFromScale(crowdScale, parsed.crowd),
				me: indexFromScale(timeScale, parsed.time),
				dget: parsed.budget ?? prev.dget,
			}));

			setInitializing(false);
		};

		void initialize();
	}, [passcode, router]);

	const saveCondition = async () => {
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
				selected_value: conditionValue,
				is_ready: true,
			},
			{ onConflict: "group_id,user_id" },
		);

		setSaving(false);
		if (error) {
			setMessage("条件の保存に失敗しました。もう一度お試しください。");
			return;
		}

		router.push(`/groups/${passcode}/result`);
	};

	if (initializing) {
		return <div className="pt-20 text-[#389E95] font-bold text-center">準備中...</div>;
	}

	const conditionItems = [
		{ key: "end", labelL: "のんびり", labelR: "活発" },
		{ key: "stance", labelL: "近め", labelR: "遠くてもいい" },
		{ key: "owd", labelL: "静か", labelR: "にぎやか" },
		{ key: "me", labelL: "短時間", labelR: "半日以上" },
	] as const;

	return (
		<div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-12 px-6 min-h-[calc(100vh-100px)] select-none">
			<div className="w-full flex justify-between items-center mb-10 px-4 relative shrink-0">
				<div className="absolute top-1/2 left-0 w-full h-0.5 bg-white z-0 -translate-y-1/2 opacity-50"></div>
				{["ホーム", "場所", "目的", "条件"].map((label, i) => (
					<div key={label} className="relative z-10 flex flex-col items-center gap-1">
						{i === 3 && (
							<div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
								<Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
							</div>
						)}
						<div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 3 ? "bg-[#389E95] border-[#389E95] scale-110 shadow-md" : "bg-white border-[#389E95]/30"}`}></div>
						<span className={`text-[10px] font-black ${i <= 3 ? "text-[#389E95]" : "text-[#389E95]/40"}`}>{label}</span>
					</div>
				))}
			</div>

			<div className="flex flex-col gap-8 w-full">
				{conditionItems.map((item) => (
					<div key={item.key} className="flex flex-col gap-3">
						<div className="flex justify-between items-center px-2">
							<span className="text-xs font-black text-[#389E95]">{item.labelL}</span>
							<span className="text-xs font-black text-[#389E95]">{item.labelR}</span>
						</div>

						<div className="flex justify-between items-center relative px-2">
							<div className="absolute top-1/2 left-4 right-4 h-px bg-[#389E95]/20 -translate-y-1/2 z-0"></div>
							{[1, 2, 3, 4, 5].map((val) => (
								<button
									key={val}
									onClick={() => setSelections({ ...selections, [item.key]: val })}
									className={`relative z-10 w-8 h-8 rounded-full border-2 transition-all duration-200 ${selections[item.key] === val ? "bg-[#389E95] border-[#389E95] scale-125 shadow-lg" : "bg-white border-[#389E95]/30"}`}
								>
									<div className={`w-1.5 h-1.5 rounded-full mx-auto ${selections[item.key] === val ? "bg-white" : "bg-[#389E95]/20"}`}></div>
								</button>
							))}
						</div>
					</div>
				))}

				<div className="flex flex-col gap-3 mt-4 mb-32">
					<div className="flex justify-between items-center px-2">
						<span className="text-xs font-black text-[#389E95]">予算</span>
						<span className="text-sm font-black text-[#389E95]">¥{selections.dget.toLocaleString()} <span className="text-[10px]">以内</span></span>
					</div>
					<div className="relative px-2 flex items-center">
						<input
							type="range"
							min="0"
							max="100000"
							step="1000"
							value={selections.dget}
							onChange={(e) => setSelections({ ...selections, dget: parseInt(e.target.value, 10) })}
							className="w-full h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-[#389E95] shadow-inner"
							style={{ backgroundImage: `linear-gradient(to right, #389E95 ${((selections.dget - 0) / (100000 - 0)) * 100}%, transparent 0%)` }}
						/>
					</div>
					<div className="flex justify-between px-2 opacity-40 text-[9px] font-bold text-[#389E95]">
						<span>¥0</span>
						<span>¥100,000+</span>
					</div>
				</div>
			</div>

			{message ? <p className="w-full mt-3 text-sm text-[#5A5A5A] text-center">{message}</p> : null}

			<div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto">
				<Link href={`/groups/${passcode}/purpose`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
					<span className="text-[#389E95] font-black tracking-widest text-sm">戻る</span>
				</Link>
				<button
					type="button"
					onClick={() => void saveCondition()}
					disabled={saving}
					className={`flex-1 bg-white rounded-2xl py-3 text-center transition-all ${saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95"}`}
				>
					<span className="text-[#389E95] font-black tracking-widest text-sm">結果表示</span>
				</button>
			</div>
			<div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
		</div>
	);
}

function GroupConditionPageContent() {
	const params = useParams<{ id: string }>();

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden select-none">
			<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />
			<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={params.id} />} />
			<ConditionSelectionContent passcode={params.id} />
		</main>
	);
}

export default function GroupConditionPage() {
	return (
		<Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
			<GroupConditionPageContent />
		</Suspense>
	);
}
