"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
	aggregate,
	indexFromScale,
	parseCondition,
	spendingScale,
	distanceScale,
	crowdScale,
	timeScale,
	toRadarValues,
	toRadarAverageValues,
} from "@/lib/group-result";

type MemberChoice = {
	user_id: string;
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
	is_ready: boolean;
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

type SuggestionCategory = "shopping" | "outdoor-nature-sightseeing";

type SupportedArea = "渋谷・原宿・表参道" | "新宿・代々木";

const SUPPORTED_AREAS: SupportedArea[] = ["渋谷・原宿・表参道", "新宿・代々木"];

function buildImagePaths(basePath: string) {
	return Array.from({ length: 6 }, (_, index) => `${basePath}/${String(index + 1).padStart(2, "0")}.svg`);
}

const AREA_IMAGE_MAP: Record<SupportedArea, Record<SuggestionCategory, string[]>> = {
	"渋谷・原宿・表参道": {
		shopping: buildImagePaths("/suggestion/shibuya-harajuku-omotesando/shopping"),
		"outdoor-nature-sightseeing": buildImagePaths("/suggestion/shibuya-harajuku-omotesando/outdoor-nature-sightseeing"),
	},
	"新宿・代々木": {
		shopping: buildImagePaths("/suggestion/shinjuku-yoyogi/shopping"),
		"outdoor-nature-sightseeing": buildImagePaths("/suggestion/shinjuku-yoyogi/outdoor-nature-sightseeing"),
	},
};

const CATCH_COPY_MAP: Record<SuggestionCategory, string[]> = {
	shopping: [
		"語り合いが主役な日",
		"ちょっと穴場な日",
		"安心して遊べる日",
		"テンポで仲良くなる日",
		"コスパ最高な日",
		"ゆるアクティブな日",
	],
	"outdoor-nature-sightseeing": [
		"いいとこどりな日",
		"近場で発見の日",
		"それぞれペースの日",
		"ゆるっと満足な日",
		"ちょうどいい冒険の日",
		"それぞれが主役の日",
	],
};

const DEFAULT_AREA = SUPPORTED_AREAS[0];

const radarAxes = ["過ごし方", "距離", "人の多さ", "予算", "時間"];

function getRankedEntries(stats: Record<string, number>) {
	return Object.entries(stats).sort((a, b) => b[1] - a[1]);
}

function pickEntry(entries: Array<[string, number]>, index: number, fallback: string) {
	return entries[index]?.[0] ?? entries[0]?.[0] ?? fallback;
}

function toSupportedArea(area: string): SupportedArea {
	if (area === "渋谷・原宿・表参道" || area === "新宿・代々木") {
		return area;
	}
	return DEFAULT_AREA;
}

function purposeToCategory(purpose: string): SuggestionCategory {
	if (purpose === "ショッピング") {
		return "shopping";
	}
	return "outdoor-nature-sightseeing";
}

function pickTwoAreaImages(area: SupportedArea, category: SuggestionCategory, cardIndex: number) {
	const areaImages = AREA_IMAGE_MAP[area][category];
	const startIndex = (cardIndex * 2) % areaImages.length;
	return [areaImages[startIndex], areaImages[(startIndex + 1) % areaImages.length]];
}

function pickCatchCopy(category: SuggestionCategory, cardIndex: number) {
	const copies = CATCH_COPY_MAP[category];
	return copies[(cardIndex * 2) % copies.length];
}

function SuggestionRadarChart({
	values,
	series,
}: {
	values: number[];
	series: Array<{ id: string; values: number[]; isSelf: boolean }>;
}) {
	const radarColors = ["#389E95", "#52A399", "#5A7C55", "#5A5A5A"];
	const averageOrange = "#FF8A00";
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

	const averagePoints = values
		.map((value, index) => {
			const point = toPoint(value, index);
			return `${point.x},${point.y}`;
		})
		.join(" ");

	return (
		<div className="w-full h-full flex items-start justify-center overflow-hidden">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="結果グラフ" className="drop-shadow-sm">
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

				{series.map((line, index) => {
					const color = radarColors[index % radarColors.length];
					const points = line.values
						.map((value, axisIndex) => {
							const point = toPoint(value, axisIndex);
							return `${point.x},${point.y}`;
						})
						.join(" ");

					return (
						<polygon
							key={line.id}
							points={points}
							fill={color}
							fillOpacity={line.isSelf ? 0.22 : 0.08}
							stroke={color}
							strokeOpacity={line.isSelf ? 1 : 0.7}
							strokeWidth={line.isSelf ? 1.8 : 1.1}
							strokeLinejoin="round"
						/>
					);
				})}

				<polygon
					points={averagePoints}
					fill="none"
					stroke={averageOrange}
					strokeWidth={1.8}
					strokeDasharray="4 3"
					strokeLinejoin="round"
				/>
				{values.map((axisValue, index) => {
					const point = toPoint(axisValue, index);
					return <circle key={`avg-dot-${index}`} cx={point.x} cy={point.y} r={1.7} fill={averageOrange} />;
				})}
				<circle cx={center} cy={center} r={2.8} fill="#389E95" />
			</svg>
		</div>
	);
}

function SuggestionCardCanvas({
	card,
	radarValues,
	radarSeries,
}: {
	card: SuggestionCard;
	radarValues: number[];
	radarSeries: Array<{ id: string; values: number[]; isSelf: boolean }>;
}) {
	return (
		<div className="rounded-3xl sm:rounded-4xl border-2 border-[#389E95] bg-[#F9FBF9] p-4 sm:p-5 shadow-[0_24px_56px_rgba(56,158,149,0.3),0_0_44px_rgba(56,158,149,0.24)] h-130 sm:h-140 overflow-hidden">
			<div className="h-full grid grid-cols-3 gap-2.5 sm:gap-3 content-start">
				<div className="row-span-1 col-span-3 rounded-2xl border border-[#389E95]/35 bg-[#D6F8C2] px-2 py-1.5 sm:px-2.5 sm:py-2 grid grid-cols-[0.8fr_2.2fr] gap-0.5 sm:gap-1 items-center">
					<div className="h-full flex flex-col items-start justify-start gap-0">
						<div className="w-full h-full -ml-4 sm:-ml-6">
							<SuggestionRadarChart values={radarValues} series={radarSeries} />
						</div>
					</div>
					<div className="h-full flex flex-col justify-start gap-0 -ml-2 sm:-ml-3 pr-1 sm:pr-2">
						<div className="flex items-start gap-0">
							<p className="text-sm sm:text-base font-black text-[#2F6E68] leading-snug tracking-[0.01em] [text-shadow:0_1px_0_rgba(255,255,255,0.55),0_2px_6px_rgba(24,78,64,0.32)]">{card.catchCopy}</p>
						</div>
						<div className="mt-2 sm:mt-3 flex items-center justify-end gap-1">
							<p className="text-sm sm:text-base font-medium text-[#6B7280]">{card.area}周辺</p>
						</div>
					</div>
				</div>

				{card.places.map((place) => (
					<div key={place.name} className="col-span-3 relative overflow-hidden rounded-2xl border border-[#389E95]/25 bg-white aspect-3/2">
						<Image src={place.imageSrc} alt={place.name} fill className="object-contain object-top" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function GroupSuggestionPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const passcode = params.id;
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
			setCurrentUserId(authData.user?.id ?? null);

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
				.select("user_id, selected_area, selected_purpose, selected_value, is_ready")
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

	const allReady = useMemo(() => choices.length > 0 && choices.every((choice) => choice.is_ready), [choices]);

	useEffect(() => {
		if (!loading && !allReady) {
			router.replace(`/groups/${passcode}/waiting`);
		}
	}, [allReady, loading, passcode, router]);

	const readyChoices = useMemo(
		() => choices.filter((choice) => choice.is_ready && Boolean(choice.selected_value)),
		[choices],
	);

	const orderedReadyChoices = useMemo(() => {
		if (!currentUserId) {
			return readyChoices;
		}
		const self = readyChoices.filter((choice) => choice.user_id === currentUserId);
		const others = readyChoices.filter((choice) => choice.user_id !== currentUserId);
		return [...self, ...others];
	}, [currentUserId, readyChoices]);

	const areaStats = useMemo(() => aggregate(readyChoices.map((choice) => choice.selected_area)), [readyChoices]);
	const purposeStats = useMemo(() => aggregate(readyChoices.map((choice) => choice.selected_purpose)), [readyChoices]);
	const parsedConditions = useMemo(() => readyChoices.map((choice) => parseCondition(choice.selected_value)), [readyChoices]);
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
	const rankedSupportedAreas = useMemo<SupportedArea[]>(() => {
		const fromVotes = topArea
			.map(([area]) => area)
			.filter((area): area is SupportedArea => area === "渋谷・原宿・表参道" || area === "新宿・代々木");
		return Array.from(new Set([...fromVotes, ...SUPPORTED_AREAS]));
	}, [topArea]);
	const radarAverageValues = useMemo(() => {
		return toRadarAverageValues(parsedConditions);
	}, [parsedConditions]);
	const radarSeries = useMemo(() => {
		return orderedReadyChoices.map((choice, index) => ({
			id: `${choice.user_id}-${index}`,
			values: toRadarValues(parseCondition(choice.selected_value)),
			isSelf: choice.user_id === currentUserId,
		}));
	}, [currentUserId, orderedReadyChoices]);

	const suggestionCards = useMemo<SuggestionCard[]>(
		() => {
			const firstArea = rankedSupportedAreas[0] ?? DEFAULT_AREA;
			const secondArea = rankedSupportedAreas[1] ?? firstArea;

			const baseCards = [
				{
					title: "まずはみんな寄りプラン",
					area: firstArea,
					category: purposeToCategory(pickEntry(topPurpose, 0, "観光")),
					placeNames: [
						`${firstArea}の人気スポット`,
						`${firstArea}の定番スポット`,
					],
				},
				{
					title: "バランス重視プラン",
					area: secondArea,
					category: purposeToCategory(pickEntry(topPurpose, 1, pickEntry(topPurpose, 0, "観光"))),
					placeNames: ["軽めに遊べるスポット", "ゆったりランチ候補"],
				},
				{
					title: "気分転換プラン",
					area: firstArea,
					category: purposeToCategory(pickEntry(topPurpose, 2, pickEntry(topPurpose, 0, "観光"))),
					placeNames: ["少し冒険するエリア", "新しい体験スポット"],
				},
			];

			return baseCards.map((card, cardIndex) => {
				const supportedArea = toSupportedArea(card.area);
				const [firstImage, secondImage] = pickTwoAreaImages(supportedArea, card.category, cardIndex);
				return {
					title: card.title,
					catchCopy: pickCatchCopy(card.category, cardIndex),
					area: supportedArea,
					places: [
						{ name: card.placeNames[0], imageSrc: firstImage },
						{ name: card.placeNames[1], imageSrc: secondImage },
					],
				};
			});
		},
		[rankedSupportedAreas, topPurpose],
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

	if (!allReady) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="relative w-full">
				<TopLogoBar className="bg-[#D6F8C2]" />
				<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={passcode} />} />
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

				{readyChoices.length === 0 ? (
					<p className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4 text-sm text-[#5A7C55]">
						まだメンバーの回答がありません。
					</p>
				) : (
					<div className="space-y-3 sm:space-y-4">
						<section className="relative z-10 left-1/2 -translate-x-1/2 w-screen -mt-9 sm:-mt-12">
							<div
								className="mx-auto w-full grid items-stretch gap-1.5 sm:gap-2.5"
								style={{
									gridTemplateColumns: "minmax(0,1fr) minmax(0,clamp(300px,calc(100vw - 136px),542px)) minmax(0,1fr)",
								}}
							>
								<div ref={leftPreviewRef} className="relative h-130 sm:h-140 overflow-hidden rounded-r-3xl">
									<div className="absolute top-0 right-0 h-full w-[clamp(300px,calc(100vw-136px),542px)] pointer-events-none">
										<SuggestionCardCanvas card={prevCard} radarValues={radarAverageValues} radarSeries={radarSeries} />
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
										<SuggestionCardCanvas card={activeCard} radarValues={radarAverageValues} radarSeries={radarSeries} />
									</div>
								</article>

								<div ref={rightPreviewRef} className="relative h-130 sm:h-140 overflow-hidden rounded-l-3xl">
									<div className="absolute top-0 left-0 h-full w-[clamp(300px,calc(100vw-136px),542px)] pointer-events-none">
										<SuggestionCardCanvas card={nextCard} radarValues={radarAverageValues} radarSeries={radarSeries} />
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
