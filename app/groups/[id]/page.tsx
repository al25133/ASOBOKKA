// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const areaOptions = ["渋谷", "新宿", "池袋", "上野", "横浜"];
const purposeOptions = ["ごはん", "カフェ", "観光", "ショッピング", "アクティビティ"];
const spendingStyleOptions = ["ゆったり", "アクティブ", "のんびり", "食べ歩き", "おまかせ"];
const distanceOptions = ["徒歩圏", "電車1駅", "電車2〜3駅", "30分以内", "どこでも"];
const crowdOptions = ["とても少なめ", "少なめ", "ふつう", "にぎやか", "とてもにぎやか"];
const timeOptions = ["1時間以内", "2時間くらい", "3時間くらい", "半日", "終日"];
const progressSteps = ["ホーム", "場所", "目的", "条件"] as const;

type ConditionSelection = {
	spendingStyle: string;
	distance: string;
	crowd: string;
	time: string;
	budget: number;
};

type MemberRow = {
	user_id: string;
	nickname: string;
	avatar: string;
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
	is_ready: boolean;
};

function OptionGroup({
	title,
	options,
	value,
	onSelect,
}: {
	title: string;
	options: string[];
	value: string;
	onSelect: (next: string) => void;
}) {
	return (
		<section className="space-y-2">
			<h2 className="text-sm font-bold text-[#5A7C55]">{title}</h2>
			<div className="grid grid-cols-2 gap-2">
				{options.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onSelect(option)}
						className={cn(
							"rounded-2xl border px-3 py-2 text-left text-sm transition",
							value === option
								? "border-[#52A399] bg-[#52A399] text-white"
								: "border-gray-200 bg-[#F9FBF9] text-[#5A5A5A] hover:bg-[#EEF7EB]",
						)}
					>
						{option}
					</button>
				))}
			</div>
		</section>
	);
}

export default function GroupRoom() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const [avatarId, setAvatarId] = useState("1");
	const [showGroupInfo, setShowGroupInfo] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [groupId, setGroupId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [area, setArea] = useState("");
	const [purpose, setPurpose] = useState("");
	const [condition, setCondition] = useState<ConditionSelection>({
		spendingStyle: "",
		distance: "",
		crowd: "",
		time: "",
		budget: 5000,
	});
	const [currentStep, setCurrentStep] = useState(0);
	const [isWaiting, setIsWaiting] = useState(false);
	const passcode = params.id;

	const fetchMembers = useCallback(
		async (targetGroupId: string) => {
			const supabase = getSupabaseClient();
			const { data: sessionData } = await supabase.auth.getSession();
			const accessToken = sessionData.session?.access_token;

			if (!accessToken) {
				setMessage("セッションが確認できませんでした。再ログインしてください。");
				return;
			}

			const response = await fetch("/api/groups/members", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ groupId: targetGroupId }),
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as { message?: string } | null;
				setMessage(result?.message ?? "メンバー情報の取得に失敗しました。");
				return;
			}

			const result = (await response.json()) as { members?: MemberRow[] };
			setMembers(result.members ?? []);
		},
		[],
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
			setUserId(authData.user.id);

			const avatar = authData.user.user_metadata?.avatar;
			if (typeof avatar === "number" || typeof avatar === "string") {
				setAvatarId(String(avatar));
			}

			if (joinResult.error || !joinResult.data) {
				setMessage("グループが見つかりませんでした。");
				setLoading(false);
				return;
			}

			setGroupId(joinResult.data);
			await fetchMembers(joinResult.data);
			setLoading(false);
		};

		void initialize();
	}, [fetchMembers, passcode, router]);

	useEffect(() => {
		if (!groupId) {
			return;
		}

		const supabase = getSupabaseClient();

		const channel = supabase
			.channel(`group-members-${groupId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "group_members",
					filter: `group_id=eq.${groupId}`,
				},
				() => {
					void fetchMembers(groupId);
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [fetchMembers, groupId]);

	const allReady = useMemo(() => members.length > 0 && members.every((member) => member.is_ready), [members]);
	const progressPercent = useMemo(() => {
		if (progressSteps.length <= 1) {
			return 0;
		}
		return (currentStep / (progressSteps.length - 1)) * 100;
	}, [currentStep]);
	const isConditionComplete = useMemo(
		() => Boolean(condition.spendingStyle && condition.distance && condition.crowd && condition.time),
		[condition],
	);
	const conditionValue = useMemo(
		() =>
			`過ごし方:${condition.spendingStyle} / 距離:${condition.distance} / 人の多さ:${condition.crowd} / 時間:${condition.time} / 予算:${condition.budget}円`,
		[condition],
	);
	const waitingPhase = useMemo(() => {
		if (!isWaiting) {
			return "form" as const;
		}
		return allReady ? ("result" as const) : ("waiting" as const);
	}, [allReady, isWaiting]);
	const headerAvatars = useMemo(() => {
		if (members.length === 0) {
			return [avatarId];
		}
		return members.slice(0, 3).map((member) => member.avatar);
	}, [avatarId, members]);

	const saveSelection = async (ready: boolean) => {
		const supabase = getSupabaseClient();
		if (!groupId || !userId) {
			return false;
		}
		if (!area || !purpose || !isConditionComplete) {
			setMessage("場所・目的・条件をすべて選択してください。");
			return false;
		}

		setSaving(true);
		setMessage(null);
		const { error } = await supabase.from("group_members").upsert(
			{
				group_id: groupId,
				user_id: userId,
				selected_area: area,
				selected_purpose: purpose,
				selected_value: conditionValue,
				is_ready: ready,
			},
			{ onConflict: "group_id,user_id" },
		);
		setSaving(false);

		if (error) {
			setMessage(error.message);
			return false;
		}

		await fetchMembers(groupId);
		setMessage(ready ? null : "選択内容を保存しました。");
		return true;
	};

	const handleNext = async () => {
		if (currentStep === 1 && !area) {
			setMessage("場所を選択してください。");
			return;
		}
		if (currentStep === 2 && !purpose) {
			setMessage("目的を選択してください。");
			return;
		}
		if (currentStep === 3) {
			if (!isConditionComplete) {
				setMessage("条件を選択してください。");
				return;
			}
			const saved = await saveSelection(true);
			if (saved) {
				setMessage(null);
				setIsWaiting(true);
			}
			return;
		}

		setMessage(null);
		setCurrentStep((prev) => Math.min(prev + 1, progressSteps.length - 1));
	};

	const handleBack = () => {
		if (currentStep === 0) {
			return;
		}
		setMessage(null);
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
			<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} />

			<HomeHeaderBar
				rightSlot={
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowGroupInfo((prev) => !prev)}
							className="flex items-center"
							aria-label="グループ情報を表示"
						>
							{headerAvatars.map((avatar, index) => (
								<div
									key={`${avatar}-${index}`}
									className={cn(
										"relative h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-white",
										index > 0 && "-ml-2",
									)}
								>
									<Image src={`/avatars/avatar${avatar}.svg`} alt="チームメイトアイコン" fill className="object-contain" />
								</div>
							))}
						</button>
						{showGroupInfo ? (
							<div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#389E95]/20 bg-white p-3 shadow-lg">
								<p className="text-xs font-bold text-[#389E95]">グループ番号</p>
								<p className="text-xl font-bold tracking-widest text-[#5A5A5A]">{passcode}</p>
								<div className="mt-3 border-t border-[#389E95]/10 pt-2">
									<p className="mb-1 text-xs font-bold text-[#389E95]">アカウント</p>
									<Link
										href="/account/settings"
										onClick={() => setShowGroupInfo(false)}
										className="block rounded-lg px-2 py-1.5 text-sm text-[#5A5A5A] hover:bg-[#F0FAED]"
									>
										アカウント設定
									</Link>
								</div>
							</div>
						) : null}
					</div>
				}
			/>

			<div className="relative z-10 w-full max-w-112.5 px-6 pt-8 pb-12 space-y-6">
				<div className="grid gap-6 md:grid-cols-[1fr_320px]">
					<section
						className={cn(
							"space-y-5 p-5",
							waitingPhase === "form" && "bg-white rounded-[30px] border border-[#389E95]/20 shadow-sm",
						)}
					>
						{waitingPhase === "waiting" ? (
							<section className="p-5">
								<div className="min-h-90 flex flex-col items-center justify-center pt-30">
									<div>
										<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
									</div>
									<div className="mt-4">
										<Image src="/待機中.svg" alt="待機中" width={180} height={180} className="object-contain" />
									</div>
									<p className="mt-4 text-base font-bold text-[#5A7C55]">待機しています</p>
								</div>
							</section>
						) : waitingPhase === "result" ? (
							<section className="p-5">
								<div className="min-h-90 flex flex-col items-center justify-center pt-30">
									<div>
										<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
									</div>
									<div className="mt-4">
										<Image src="/待機完了.svg" alt="待機完了" width={180} height={180} className="object-contain" />
									</div>
									<p className="mt-3 text-base font-bold text-[#5A7C55]">お待たせしました！</p>
									<button
										type="button"
										onClick={() => router.push(`/groups/${passcode}/result`)}
										className="mt-4 w-full max-w-72 bg-[#52A399] text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
									>
										結果を見る
									</button>
								</div>
							</section>
						) : (
							<>
						<div className="space-y-2">
							<div className="h-3 w-full overflow-hidden rounded-full bg-[#EAF7F4]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)}>
								<div className="h-full rounded-full bg-[#52A399] transition-all" style={{ width: `${progressPercent}%` }} />
							</div>
							<div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-[#6D8D69]">
								{progressSteps.map((step, index) => (
									<p key={step} className={cn(index <= currentStep && "text-[#389E95]")}>{step}</p>
								))}
							</div>
						</div>

						{currentStep === 0 ? (
							<section className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4">
								<h2 className="text-sm font-bold text-[#5A7C55] mb-2">ホーム</h2>
								<p className="text-sm text-[#5A5A5A] leading-relaxed">
									下の「次へ」から、場所→目的→条件の順で選択してください。最後の「次へ」で待機完了になります。
								</p>
							</section>
						) : null}

						{currentStep === 1 ? <OptionGroup title="場所" options={areaOptions} value={area} onSelect={setArea} /> : null}
						{currentStep === 2 ? <OptionGroup title="目的" options={purposeOptions} value={purpose} onSelect={setPurpose} /> : null}
						{currentStep === 3 ? (
							<div className="space-y-4">
								<OptionGroup
									title="過ごし方"
									options={spendingStyleOptions}
									value={condition.spendingStyle}
									onSelect={(next) => setCondition((prev) => ({ ...prev, spendingStyle: next }))}
								/>
								<OptionGroup
									title="距離"
									options={distanceOptions}
									value={condition.distance}
									onSelect={(next) => setCondition((prev) => ({ ...prev, distance: next }))}
								/>
								<OptionGroup
									title="人の多さ"
									options={crowdOptions}
									value={condition.crowd}
									onSelect={(next) => setCondition((prev) => ({ ...prev, crowd: next }))}
								/>
								<OptionGroup
									title="時間"
									options={timeOptions}
									value={condition.time}
									onSelect={(next) => setCondition((prev) => ({ ...prev, time: next }))}
								/>
								<section className="space-y-2">
									<h2 className="text-sm font-bold text-[#5A7C55]">予算</h2>
									<input
										type="range"
										min={0}
										max={100000}
										step={1000}
										value={condition.budget}
										onChange={(event) => setCondition((prev) => ({ ...prev, budget: Number(event.target.value) }))}
										className="w-full accent-[#52A399]"
									/>
									<p className="text-sm font-semibold text-[#389E95]">{condition.budget.toLocaleString()}円</p>
								</section>
							</div>
						) : null}

						<div className="grid grid-cols-2 gap-2 pt-2">
							<button
								type="button"
								disabled={saving || currentStep === 0}
								onClick={handleBack}
								className="w-full bg-white border-2 border-[#52A399]/40 text-[#389E95] font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-70"
							>
								戻る
							</button>
							<button
								type="button"
								disabled={saving}
								onClick={() => void handleNext()}
								className="w-full bg-[#52A399] text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-70"
							>
								{currentStep === 3 ? "結果表示" : "次へ"}
							</button>
						</div>
							</>
						)}
						{!isWaiting && message ? <p className="text-sm text-[#5A5A5A]">{message}</p> : null}
					</section>

					{isWaiting ? null : (
					<aside className="bg-white rounded-[30px] p-5 border border-[#389E95]/20 shadow-sm">
						<h2 className="mb-3 text-sm font-bold text-[#5A7C55]">メンバー状況</h2>
						<ul className="space-y-2">
							{members.map((member) => (
								<li key={member.user_id} className="rounded-2xl border border-[#389E95]/20 p-3 text-sm bg-[#F9FBF9]">
									<div className="mb-2 flex items-center gap-2">
										<div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#D6F8C2] bg-white">
											<Image src={`/avatars/avatar${member.avatar}.svg`} alt="メンバーアイコン" fill className="object-contain" />
										</div>
										<p className="font-semibold text-[#5A5A5A]">{member.user_id === userId ? "あなた" : member.nickname}</p>
									</div>
									<p className="text-[#6D8D69]">エリア: {member.selected_area ?? "未選択"}</p>
									<p className="text-[#6D8D69]">目的: {member.selected_purpose ?? "未選択"}</p>
									<p className="text-[#6D8D69]">条件: {member.selected_value ?? "未選択"}</p>
									<p className={member.is_ready ? "text-emerald-600" : "text-[#6D8D69]"}>{member.is_ready ? "待機完了" : "入力中"}</p>
								</li>
							))}
						</ul>
					</aside>
					)}
				</div>
			</div>
		</main>
	);
}
