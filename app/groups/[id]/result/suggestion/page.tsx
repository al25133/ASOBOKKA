"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountMenu } from "@/components/ui/account-menu";
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
	budget: number | null;
	time: string | null;
};

type SuggestionPlace = {
	name: string;
	imageSrc: string;
};

type SuggestionCard = {
	title: string;
	catchCopy: string;
	area: string;
	places: SuggestionPlace[];
};

const spendingScale = ["のんびり", "ゆったり", "おまかせ", "食べ歩き", "アクティブ"];
const distanceScale = ["徒歩圏", "電車1駅", "電車2〜3駅", "30分以内", "どこでも"];
const crowdScale = ["とても少なめ", "少なめ", "ふつう", "にぎやか", "とてもにぎやか"];
const timeScale = ["1時間以内", "2時間くらい", "3時間くらい", "半日", "終日"];
const radarAxes = ["過ごし方", "距離", "人の多さ", "予算", "時間"];

function indexFromScale(scale: string[], value: string | null) {
	if (!value) {
		return 3;
	}
	const index = scale.findIndex((item) => item === value);
	return index >= 0 ? index + 1 : 3;
}

function budgetToScale(budget: number | null) {
	if (budget === null) {
		return 3;
	}
	if (budget <= 20000) {
		return 1;
	}
	if (budget <= 40000) {
		return 2;
	}
	if (budget <= 60000) {
		return 3;
	}
	if (budget <= 80000) {
		return 4;
	}
	return 5;
}

function getGroupTypeByMismatch(score: number) {
	if (score <= 25) {
		return "ぴったり型";
	}
	if (score <= 45) {
		return "バランス型";
	}
	if (score <= 65) {
		return "わいわい型";
	}
	return "チャレンジ型";
}

function purposeToImage(purpose: string) {
	const map: Record<string, string> = {
		ごはん: "/purpose/meal.svg",
		カフェ: "/purpose/cafe.svg",
		観光: "/purpose/sightseeing.svg",
		ショッピング: "/purpose/shopping.svg",
		アクティビティ: "/purpose/outdoor.svg",
	};

	return map[purpose] ?? "/purpose/sightseeing.svg";
}

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
			budget: null,
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
		budget: (() => {
			const budgetRaw = getPart("予算");
			if (!budgetRaw) {
				return null;
			}
			const normalized = Number(budgetRaw.replace(/[^0-9]/g, ""));
			return Number.isFinite(normalized) ? normalized : null;
		})(),
		time: getPart("時間"),
	};
}

function getRankedEntries(stats: Record<string, number>) {
	return Object.entries(stats).sort((a, b) => b[1] - a[1]);
}

function pickEntry(entries: Array<[string, number]>, index: number, fallback: string) {
	return entries[index]?.[0] ?? entries[0]?.[0] ?? fallback;
}

function SuggestionRadarChart({ values }: { values: number[] }) {
	const size = 148;
	const center = size / 2;
	const maxRadius = 52;
	const rings = [1, 2, 3, 4, 5];
	const axisCount = radarAxes.length;

	const angleAt = (index: number) => ((Math.PI * 2) / axisCount) * index - Math.PI / 2;
	const toPoint = (value: number, index: number, clamp = true) => {
		const angle = angleAt(index);
		const normalized = clamp ? Math.max(0, Math.min(5, value)) : Math.max(0, value);
		const radius = maxRadius * (normalized / 5);
		return {
			x: center + Math.cos(angle) * radius,
			y: center + Math.sin(angle) * radius,
		};
	};

	const polygonPoints = values
		.map((value, index) => {
			const point = toPoint(value, index);
			return `${point.x},${point.y}`;
		})
		.join(" ");

	return (
		<div className="w-full h-full flex items-start justify-center overflow-hidden">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="結果グラフ">
				{rings.map((ring) => {
					const points = radarAxes
						.map((_, index) => {
							const point = toPoint(ring, index);
							return `${point.x},${point.y}`;
						})
						.join(" ");
					return <polygon key={ring} points={points} fill="none" stroke="#389E95" strokeOpacity="0.26" strokeWidth={1.1} />;
				})}

				{radarAxes.map((_, index) => {
					const point = toPoint(5, index);
					return <line key={`axis-${index}`} x1={center} y1={center} x2={point.x} y2={point.y} stroke="#389E95" strokeOpacity="0.32" />;
				})}

				<polygon points={polygonPoints} fill="#389E95" fillOpacity={0.24} stroke="#389E95" strokeWidth={2} strokeLinejoin="round" />
				<circle cx={center} cy={center} r={2.8} fill="#389E95" />
			</svg>
		</div>
	);
}

function SuggestionCardCanvas({
	card,
	cardNumber,
	radarValues,
	groupType,
}: {
	card: SuggestionCard;
	cardNumber: number;
	radarValues: number[];
	groupType: string;
}) {
	return (
		<div className="rounded-3xl sm:rounded-4xl border-2 border-[#389E95] bg-[#F9FBF9] p-4 sm:p-5 shadow-[0_24px_56px_rgba(56,158,149,0.3),0_0_44px_rgba(56,158,149,0.24)] h-[520px] sm:h-[560px]">
			<div className="h-full grid grid-cols-3 grid-rows-4 gap-2.5 sm:gap-3">
				<div className="row-span-1 col-span-3 px-0 py-0 grid grid-cols-[0.85fr_2.15fr] gap-1.5 sm:gap-2 items-center">
					<div className="h-full flex flex-col items-start justify-start gap-0">
						<p className="text-sm font-bold text-[#389E95] leading-none">{groupType}</p>
						<div className="-mt-1 w-full h-full -ml-4 sm:-ml-6">
							<SuggestionRadarChart values={radarValues} />
						</div>
					</div>
					<div className="h-full flex flex-col justify-start gap-0">
						<div className="flex items-start gap-0">
							<p className="text-xs sm:text-[13px] font-bold text-[#5A7C55] leading-snug">{card.catchCopy}</p>
						</div>
						<div className="flex items-center justify-between gap-1">
							<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#389E95] px-1.5 text-[10px] font-bold text-white">
								{cardNumber}
							</span>
							<p className="text-xs sm:text-sm font-bold text-[#389E95]">{card.area}</p>
						</div>
					</div>
				</div>

				{card.places.map((place) => (
					<div key={place.name} className="row-span-1 col-span-3 relative overflow-hidden rounded-2xl border border-[#389E95]/25 bg-white">
						<Image src={place.imageSrc} alt={place.name} fill className="object-cover opacity-85" />
						<div className="absolute inset-0 bg-white/35" />
						<div className="absolute inset-0 flex items-center justify-between px-3 sm:px-3.5">
							<p className="text-xs sm:text-sm font-bold text-[#2F6E68]">{place.name}</p>
							<span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-[#389E95]">画像差し替え予定</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
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
	const leftPreviewRef = useRef<HTMLDivElement | null>(null);
	const rightPreviewRef = useRef<HTMLDivElement | null>(null);
	const previousCardIndexRef = useRef(0);

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
	const budgetStats = useMemo(() => aggregate(parsedConditions.map((item) => String(budgetToScale(item.budget)))), [parsedConditions]);
	const timeStats = useMemo(() => aggregate(parsedConditions.map((item) => item.time)), [parsedConditions]);

	const topArea = useMemo(() => getRankedEntries(areaStats), [areaStats]);
	const topPurpose = useMemo(() => getRankedEntries(purposeStats), [purposeStats]);
	const topSpending = useMemo(() => getRankedEntries(spendingStats), [spendingStats]);
	const topDistance = useMemo(() => getRankedEntries(distanceStats), [distanceStats]);
	const topCrowd = useMemo(() => getRankedEntries(crowdStats), [crowdStats]);
	const topTime = useMemo(() => getRankedEntries(timeStats), [timeStats]);
	const radarAverageValues = useMemo(() => {
		if (parsedConditions.length === 0) {
			return [3, 3, 3, 3, 3];
		}

		const scoreRows = parsedConditions.map((condition) => [
			indexFromScale(spendingScale, condition.spendingStyle),
			indexFromScale(distanceScale, condition.distance),
			indexFromScale(crowdScale, condition.crowd),
			budgetToScale(condition.budget),
			indexFromScale(timeScale, condition.time),
		]);

		return radarAxes.map((_, axisIndex) => {
			const sum = scoreRows.reduce((acc, values) => acc + (values[axisIndex] ?? 0), 0);
			return Number((sum / scoreRows.length).toFixed(1));
		});
	}, [parsedConditions]);
	const mismatchTotal = useMemo(() => {
		const totalVotes = choices.length;
		if (totalVotes === 0) {
			return 0;
		}

		const getMismatchScore = (stats: Record<string, number>) => {
			const top = Math.max(0, ...Object.values(stats));
			return Math.round(100 - (top / totalVotes) * 100);
		};

		const scores = [
			getMismatchScore(spendingStats),
			getMismatchScore(distanceStats),
			getMismatchScore(crowdStats),
			getMismatchScore(budgetStats),
			getMismatchScore(timeStats),
		];

		const sum = scores.reduce((acc, value) => acc + value, 0);
		return Math.round(sum / scores.length);
	}, [budgetStats, choices.length, crowdStats, distanceStats, spendingStats, timeStats]);
	const groupType = useMemo(() => getGroupTypeByMismatch(mismatchTotal), [mismatchTotal]);

	const suggestionCards = useMemo<SuggestionCard[]>(
		() => [
			{
				title: "まずはみんな寄りプラン",
				catchCopy: `${pickEntry(topSpending, 0, "おまかせ")}に楽しむ王道プラン`,
				area: pickEntry(topArea, 0, "都内"),
				places: [
					{ name: `${pickEntry(topArea, 0, "都内")}の人気スポット`, imageSrc: purposeToImage(pickEntry(topPurpose, 0, "観光")) },
					{ name: `${pickEntry(topArea, 0, "都内")}の定番カフェ`, imageSrc: "/purpose/cafe.svg" },
					{ name: `${pickEntry(topArea, 0, "都内")}の寄り道エリア`, imageSrc: "/purpose/sightseeing.svg" },
				],
			},
			{
				title: "バランス重視プラン",
				catchCopy: `${pickEntry(topDistance, 0, "30分以内")}で巡るちょうどいい休日`,
				area: pickEntry(topArea, 1, pickEntry(topArea, 0, "都内")),
				places: [
					{ name: "軽めに遊べるスポット", imageSrc: "/purpose/entartainment.svg" },
					{ name: "ゆったりランチ候補", imageSrc: "/purpose/meal.svg" },
					{ name: "散歩しやすい街並み", imageSrc: purposeToImage(pickEntry(topPurpose, 1, pickEntry(topPurpose, 0, "観光"))) },
				],
			},
			{
				title: "気分転換プラン",
				catchCopy: `${pickEntry(topCrowd, 0, "ふつう")}×${pickEntry(topTime, 0, "2時間くらい")}で新鮮に`,
				area: pickEntry(topArea, 2, pickEntry(topArea, 0, "都内")),
				places: [
					{ name: "少し冒険するエリア", imageSrc: "/purpose/outdoor.svg" },
					{ name: "新しい体験スポット", imageSrc: "/purpose/handmade.svg" },
					{ name: "最後に寄れる休憩場所", imageSrc: "/purpose/museum.svg" },
				],
			},
		],
		[topArea, topCrowd, topDistance, topPurpose, topSpending, topTime],
	);

	useEffect(() => {
		if (!activeCardRef.current || suggestionCards.length === 0) {
			return;
		}

		const previousIndex = previousCardIndexRef.current;
		if (previousIndex === activeCardIndex) {
			return;
		}

		const movedNext = (previousIndex + 1) % suggestionCards.length === activeCardIndex;
		const offset = movedNext ? 72 : -72;

		activeCardRef.current.animate(
			[
				{ transform: `translateX(${offset}px)`, opacity: 0.78 },
				{ transform: "translateX(0)", opacity: 1 },
			],
			{
				duration: 260,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)",
			}
		);

		const previewOffset = movedNext ? 44 : -44;
		leftPreviewRef.current?.animate(
			[
				{ transform: `translateX(${previewOffset}px)`, opacity: 0.82 },
				{ transform: "translateX(0)", opacity: 1 },
			],
			{
				duration: 260,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)",
			}
		);
		rightPreviewRef.current?.animate(
			[
				{ transform: `translateX(${previewOffset}px)`, opacity: 0.82 },
				{ transform: "translateX(0)", opacity: 1 },
			],
			{
				duration: 260,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)",
			}
		);

		previousCardIndexRef.current = activeCardIndex;
	}, [activeCardIndex, suggestionCards.length]);

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

	const activeCard = suggestionCards[activeCardIndex];
	const prevCardIndex = (activeCardIndex - 1 + suggestionCards.length) % suggestionCards.length;
	const nextCardIndex = (activeCardIndex + 1) % suggestionCards.length;
	const prevCard = suggestionCards[prevCardIndex];
	const nextCard = suggestionCards[nextCardIndex];

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="relative w-full">
				<TopLogoBar className="bg-[#D6F8C2]" />
				<HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />
			</div>

			<div className="w-full max-w-112.5 rounded-t-[60px] grow px-4 sm:px-7 pt-0 pb-12 sm:pb-16">
				<div className="-mt-2 sm:-mt-3 mb-0 flex justify-center">
					<Image
						src="/こんなのはどう.svg"
						alt="提案しているキャラクター"
						width={168}
						height={168}
						className="h-28 w-28 sm:h-36 sm:w-36 object-contain"
						priority
					/>
				</div>
				{message ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{message}</p> : null}

				{choices.length === 0 ? (
					<p className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4 text-sm text-[#5A7C55]">
						まだメンバーの回答がありません。
					</p>
				) : (
					<div className="space-y-3 sm:space-y-4">
						<section className="w-full -mt-9 sm:-mt-12 relative z-10">
							<div className="mx-auto w-full max-w-[760px] grid grid-cols-[1fr_5fr_1fr] items-stretch gap-1.5 sm:gap-2.5">
								<div ref={leftPreviewRef} className="relative h-[520px] sm:h-[560px] overflow-hidden rounded-l-3xl">
									<div className="absolute top-0 right-0 h-full w-[560px] sm:w-[620px] pointer-events-none">
										<SuggestionCardCanvas card={prevCard} cardNumber={prevCardIndex + 1} radarValues={radarAverageValues} groupType={groupType} />
									</div>
									<button
										type="button"
										onClick={handlePrevCard}
										aria-label="前のカードへ"
										className="absolute inset-0 z-10 active:scale-95 transition-transform"
									/>
								</div>

								<article key={`${activeCard.title}-${activeCardIndex}`} className="w-full">
									<div ref={activeCardRef}>
										<SuggestionCardCanvas card={activeCard} cardNumber={activeCardIndex + 1} radarValues={radarAverageValues} groupType={groupType} />
									</div>
								</article>

								<div ref={rightPreviewRef} className="relative h-[520px] sm:h-[560px] overflow-hidden rounded-r-3xl">
									<div className="absolute top-0 left-0 h-full w-[560px] sm:w-[620px] pointer-events-none">
										<SuggestionCardCanvas card={nextCard} cardNumber={nextCardIndex + 1} radarValues={radarAverageValues} groupType={groupType} />
									</div>
									<button
										type="button"
										onClick={handleNextCard}
										aria-label="次のカードへ"
										className="absolute inset-0 z-10 active:scale-95 transition-transform"
									/>
								</div>
							</div>
							<p className="mt-2 text-center text-xs sm:text-sm text-[#5A7C55]">
								{activeCardIndex + 1} / {suggestionCards.length}
							</p>
						</section>

						<div className="flex justify-center pt-0.5">
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
