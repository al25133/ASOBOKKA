"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountMenu, HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberChoice = {
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
};

type ParsedCondition = {
	spendingStyle: string | null;
	distance: string | null;
	crowd: string | null;
	time: string | null;
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

function parseCondition(raw: string | null): ParsedCondition {
	if (!raw) {
		return {
			spendingStyle: null,
			distance: null,
			crowd: null,
			time: null,
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
	};
}

function getRankedEntries(stats: Record<string, number>) {
	return Object.entries(stats).sort((a, b) => b[1] - a[1]);
}

function pickEntry(entries: Array<[string, number]>, index: number, fallback: string) {
	return entries[index]?.[0] ?? entries[0]?.[0] ?? fallback;
}

export default function GroupSuggestionPage() {
	const params = useParams<{ id: string }>();
	const passcode = params.id;
	const [avatarId, setAvatarId] = useState("1");
	const [loading, setLoading] = useState(true);
	const [choices, setChoices] = useState<MemberChoice[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [activeCardIndex, setActiveCardIndex] = useState(0);
	const [savingCard, setSavingCard] = useState(false);
	const activeCardRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const load = async () => {
			const supabase = getSupabaseClient();
			const { data: authData } = await supabase.auth.getUser();
			const avatar = authData.user?.user_metadata?.avatar;
			if (typeof avatar === "number" || typeof avatar === "string") {
				setAvatarId(String(avatar));
			}

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
	const parsedConditions = useMemo(() => choices.map((choice) => parseCondition(choice.selected_value)), [choices]);
	const spendingStats = useMemo(() => aggregate(parsedConditions.map((item) => item.spendingStyle)), [parsedConditions]);
	const distanceStats = useMemo(() => aggregate(parsedConditions.map((item) => item.distance)), [parsedConditions]);
	const crowdStats = useMemo(() => aggregate(parsedConditions.map((item) => item.crowd)), [parsedConditions]);
	const timeStats = useMemo(() => aggregate(parsedConditions.map((item) => item.time)), [parsedConditions]);

	const topArea = useMemo(() => getRankedEntries(areaStats), [areaStats]);
	const topPurpose = useMemo(() => getRankedEntries(purposeStats), [purposeStats]);
	const topSpending = useMemo(() => getRankedEntries(spendingStats), [spendingStats]);
	const topDistance = useMemo(() => getRankedEntries(distanceStats), [distanceStats]);
	const topCrowd = useMemo(() => getRankedEntries(crowdStats), [crowdStats]);
	const topTime = useMemo(() => getRankedEntries(timeStats), [timeStats]);

	const suggestionCards = useMemo(
		() => [
			{
				title: "まずはみんな寄りプラン",
				detail: `${pickEntry(topArea, 0, "都内")}で${pickEntry(topPurpose, 0, "ごはん")}。過ごし方は${pickEntry(topSpending, 0, "おまかせ")}を軸に。`,
			},
			{
				title: "バランス重視プラン",
				detail: `${pickEntry(topArea, 1, pickEntry(topArea, 0, "都内"))}×${pickEntry(topPurpose, 1, pickEntry(topPurpose, 0, "ごはん"))}で、移動は${pickEntry(topDistance, 0, "30分以内")}に。`,
			},
			{
				title: "気分転換プラン",
				detail: `混雑${pickEntry(topCrowd, 0, "ふつう")}・所要${pickEntry(topTime, 0, "2時間くらい")}で、いつもと違う選択をひとつ入れてみる。`,
			},
		],
		[topArea, topCrowd, topDistance, topPurpose, topSpending, topTime],
	);

	const handlePrevCard = () => {
		if (suggestionCards.length === 0) {
			return;
		}
		setActiveCardIndex((prev) => (prev - 1 + suggestionCards.length) % suggestionCards.length);
	};

	const handleNextCard = () => {
		if (suggestionCards.length === 0) {
			return;
		}
		setActiveCardIndex((prev) => (prev + 1) % suggestionCards.length);
	};

	const handleCardGet = async () => {
		if (!activeCardRef.current || savingCard) {
			return;
		}

		setSavingCard(true);
		try {
			const dataUrl = await toPng(activeCardRef.current, {
				cacheBust: true,
				pixelRatio: 2,
				backgroundColor: "#F9FBF9",
			});

			const link = document.createElement("a");
			link.download = `asobokka-suggestion-${passcode}-${activeCardIndex + 1}.png`;
			link.href = dataUrl;
			link.click();
		} catch {
			setMessage("カード画像の保存に失敗しました。もう一度お試しください。");
		} finally {
			setSavingCard(false);
		}
	};

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="relative w-full">
				<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />
				<HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />
			</div>

			<div className="w-full max-w-112.5 bg-white rounded-t-[60px] grow px-4 sm:px-7 pt-8 sm:pt-10 pb-12 sm:pb-16 shadow-2xl">
				<div className="-mt-2 sm:-mt-3 mb-3 flex justify-center">
					<Image
						src="/こんなのはどう.svg"
						alt="提案しているキャラクター"
						width={168}
						height={168}
						className="h-28 w-28 sm:h-36 sm:w-36 object-contain"
						priority
					/>
				</div>
				<p className="text-center text-sm text-[#6D8D69] mb-8">ボタンで提案カードを切り替えよう。</p>

				{message ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{message}</p> : null}

				{choices.length === 0 ? (
					<p className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4 text-sm text-[#5A7C55]">
						まだメンバーの回答がありません。
					</p>
				) : (
					<div className="space-y-5">
						<div className="flex items-center justify-center gap-3">
							<button
								type="button"
								onClick={handlePrevCard}
								className="rounded-full border-2 border-[#389E95] bg-white px-4 py-2 text-sm font-bold text-[#389E95] active:scale-95 transition-transform"
							>
								← 前へ
							</button>
							<span className="text-xs sm:text-sm text-[#5A7C55]">
								{activeCardIndex + 1} / {suggestionCards.length}
							</span>
							<button
								type="button"
								onClick={handleNextCard}
								className="rounded-full border-2 border-[#389E95] bg-white px-4 py-2 text-sm font-bold text-[#389E95] active:scale-95 transition-transform"
							>
								次へ →
							</button>
						</div>

						<section className="grid grid-cols-3 gap-2.5 sm:gap-3">
							{suggestionCards.map((card, index) => {
								const isActive = index === activeCardIndex;

								return (
									<article
										key={`${card.title}-${index}`}
										className="relative py-2 sm:py-3 transition-transform duration-200"
										style={{
											transform: `scale(${isActive ? 1 : 0.95})`,
											opacity: isActive ? 1 : 0.75,
										}}
									>
										<div
											ref={isActive ? activeCardRef : null}
											className="rounded-3xl sm:rounded-[28px] border-2 border-[#389E95] bg-[#F9FBF9] px-3 sm:px-4 py-4 sm:py-5 shadow-[0_0_18px_rgba(56,158,149,0.15)] h-full"
										>
											<div className="mb-2.5 flex items-center gap-2">
												<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#389E95] px-1.5 text-[10px] font-bold text-white">
													{index + 1}
												</span>
												<h2 className="text-[13px] sm:text-sm font-bold text-[#5A7C55] leading-tight">{card.title}</h2>
											</div>
											<p className="text-[12px] sm:text-[13px] text-[#5A5A5A] leading-relaxed">{card.detail}</p>
										</div>
									</article>
								);
							})}
						</section>

						<div className="flex justify-center pt-1">
							<Image
								src="/歩いてる.svg"
								alt="歩いてるキャラクター"
								width={172}
								height={80}
								className="h-14 sm:h-16 w-auto object-contain"
							/>
						</div>

						<div className="w-full bg-[#52A399] rounded-[30px] p-2.5 sm:p-3 shadow-lg flex justify-between gap-2.5 sm:gap-3">
							<Link
								href={`/groups/${passcode}/result`}
								className="flex-1 bg-white rounded-2xl py-2.5 min-h-11 flex items-center justify-center active:scale-95 transition-transform"
							>
								<span className="text-[#389E95] font-bold">ズレ表示へ戻る</span>
							</Link>
							<button
								type="button"
								onClick={() => void handleCardGet()}
								disabled={savingCard}
								className={`flex-1 bg-white rounded-2xl py-2.5 min-h-11 flex items-center justify-center transition-transform ${savingCard ? "opacity-60" : "active:scale-95"}`}
							>
								<span className="text-[#389E95] font-bold">{savingCard ? "保存中..." : "カードゲット"}</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
