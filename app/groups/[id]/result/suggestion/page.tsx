"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
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
	const [activeVirtualIndex, setActiveVirtualIndex] = useState(-1);
	const [cardOffsets, setCardOffsets] = useState<Record<number, number>>({});
	const carouselRef = useRef<HTMLDivElement | null>(null);
	const isAdjustingScrollRef = useRef(false);

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

	const loopedCards = useMemo(() => {
		if (suggestionCards.length === 0) {
			return [] as Array<{ card: (typeof suggestionCards)[number]; virtualIndex: number; realIndex: number }>;
		}

		return Array.from({ length: 3 }, (_, block) =>
			suggestionCards.map((card, index) => ({
				card,
				realIndex: index,
				virtualIndex: block * suggestionCards.length + index,
			})),
		).flat();
	}, [suggestionCards]);

	const normalizedActiveVirtualIndex = useMemo(() => {
		if (suggestionCards.length === 0) {
			return 0;
		}
		const defaultIndex = suggestionCards.length + (suggestionCards.length > 1 ? 1 : 0);
		const baseIndex = activeVirtualIndex < 0 ? defaultIndex : activeVirtualIndex;
		const maxIndex = loopedCards.length - 1;
		return Math.min(Math.max(baseIndex, 0), maxIndex);
	}, [activeVirtualIndex, loopedCards.length, suggestionCards.length]);

	useEffect(() => {
		if (suggestionCards.length === 0 || !carouselRef.current) {
			return;
		}
		const initialIndex = suggestionCards.length + (suggestionCards.length > 1 ? 1 : 0);
		const target = carouselRef.current.querySelector<HTMLElement>(`[data-card-index='${initialIndex}']`);
		target?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
	}, [suggestionCards]);

	const handleCarouselScroll = () => {
		if (!carouselRef.current || isAdjustingScrollRef.current) {
			return;
		}
		const viewport = carouselRef.current;
		const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
		const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-card-index]"));

		if (cards.length === 0) {
			return;
		}

		let nearestIndex = normalizedActiveVirtualIndex;
		let nearestDistance = Number.POSITIVE_INFINITY;
		const nextOffsets: Record<number, number> = {};

		cards.forEach((card) => {
			const cardIndex = Number(card.dataset.cardIndex ?? "0");
			const cardCenter = card.offsetLeft + card.offsetWidth / 2;
			const offset = (cardCenter - viewportCenter) / Math.max(viewport.clientWidth * 0.5, 1);
			nextOffsets[cardIndex] = offset;
			const distance = Math.abs(cardCenter - viewportCenter);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestIndex = cardIndex;
			}
		});
		setCardOffsets(nextOffsets);

		if (nearestIndex !== normalizedActiveVirtualIndex) {
			setActiveVirtualIndex(nearestIndex);
		}

		if (suggestionCards.length <= 1) {
			return;
		}
		const groupSize = suggestionCards.length;

		if (nearestIndex < groupSize || nearestIndex >= groupSize * 2) {
			isAdjustingScrollRef.current = true;
			const targetIndex = nearestIndex < groupSize ? nearestIndex + groupSize : nearestIndex - groupSize;
			const target = viewport.querySelector<HTMLElement>(`[data-card-index='${targetIndex}']`);
			target?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
			setActiveVirtualIndex(targetIndex);
			requestAnimationFrame(() => {
				isAdjustingScrollRef.current = false;
			});
		}
	};

	const handleCarouselWheel = (event: React.WheelEvent<HTMLElement>) => {
		if (!carouselRef.current) {
			return;
		}

		const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
		if (dominantDelta === 0) {
			return;
		}

		event.preventDefault();
		const limitedStep = Math.sign(dominantDelta) * Math.min(Math.abs(dominantDelta), 10);
		carouselRef.current.scrollBy({ left: limitedStep, behavior: "auto" });
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
				<p className="text-center text-sm text-[#6D8D69] mb-8">横にスワイプして提案を切り替えよう。</p>

				{message ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{message}</p> : null}

				{choices.length === 0 ? (
					<p className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4 text-sm text-[#5A7C55]">
						まだメンバーの回答がありません。
					</p>
				) : (
					<div className="space-y-5">
						<div className="h-[clamp(260px,36vh,360px)]" aria-hidden />
						<section
							ref={carouselRef}
							onScroll={handleCarouselScroll}
							onWheel={handleCarouselWheel}
							className="fixed left-1/2 top-1/2 z-40 w-[min(94vw,30rem)] sm:w-[min(86vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-x-auto snap-x snap-mandatory touch-pan-x overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 sm:px-2"
						>
							<div className="flex gap-2.5 sm:gap-3 pb-2">
								{loopedCards.map(({ card, virtualIndex, realIndex }) => {
									const offset = cardOffsets[virtualIndex] ?? virtualIndex - normalizedActiveVirtualIndex;
									const clamped = Math.max(-1.6, Math.min(1.6, offset));
									const rotate = Math.abs(clamped) < 0.12 ? 0 : clamped * 14;
									const absOffset = Math.min(Math.abs(clamped), 1.2);
									const scale = 1 - absOffset * 0.08;
									const opacity = 1 - absOffset * 0.18;
									const zIndex = 30 - Math.round(absOffset * 10);

									return (
									<article
										key={`${card.title}-${virtualIndex}`}
										data-card-index={virtualIndex}
										className="snap-center snap-always shrink-0 basis-[82%] sm:basis-[78%] max-w-sm py-2.5 sm:py-3 relative transition-transform duration-200"
										style={{
											transform: `rotate(${rotate}deg) scale(${scale})`,
											opacity,
											zIndex,
										}}
									>
										<div className="relative z-10 rounded-[28px] sm:rounded-[30px] border-2 border-[#389E95] bg-[#F9FBF9] px-4 sm:px-5 py-5 sm:py-6 shadow-[0_0_18px_rgba(56,158,149,0.15)]">
											<div className="mb-3 flex items-center gap-2">
												<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#389E95] px-1.5 text-[10px] font-bold text-white">
													{realIndex + 1}
												</span>
												<h2 className="text-[15px] sm:text-base font-bold text-[#5A7C55]">{card.title}</h2>
											</div>
											<p className="text-[13px] sm:text-sm text-[#5A5A5A] leading-relaxed min-h-24">{card.detail}</p>
										</div>
									</article>
									);
								})}
							</div>
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
							<button type="button" className="flex-1 bg-white rounded-2xl py-2.5 min-h-11 flex items-center justify-center active:scale-95 transition-transform">
								<span className="text-[#389E95] font-bold">カードゲット</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
