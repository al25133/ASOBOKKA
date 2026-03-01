"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
	aggregate,
	budgetToScale,
	indexFromScale,
	parseCondition,
	spendingScale,
	distanceScale,
	crowdScale,
	timeScale,
	type ParsedCondition,
} from "@/lib/group-result";

// --- 型定義 ---
type MemberChoice = {
	user_id: string;
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
	is_ready: boolean;
};

type RadarAxis = {
	label: string;
	key: "spendingStyle" | "distance" | "crowd" | "budget" | "time";
};

type MemberRadarSeries = {
	id: string;
	userId: string;
	label: string;
	values: number[];
	isSelf: boolean;
};

const radarAxes: RadarAxis[] = [
	{ label: "過ごし方", key: "spendingStyle" },
	{ label: "距離", key: "distance" },
	{ label: "人の多さ", key: "crowd" },
	{ label: "予算", key: "budget" },
	{ label: "時間", key: "time" },
];

const radarColors = ["#389E95", "#52A399", "#5A7C55", "#5A5A5A"];

function getGroupTypeByMismatch(score: number) {
	if (score <= 25) return "ぴったり型";
	if (score <= 45) return "バランス型";
	if (score <= 65) return "わいわい型";
	return "チャレンジ型";
}

function buildRecommendationTags(choice: MemberChoice, condition: ParsedCondition) {
	const byPurpose: Record<string, string[]> = {
		ごはん: ["食べ歩き", "ローカルグルメ", "カフェ巡り"],
		カフェ: ["ミュージアム", "ブックカフェ", "スイーツ"],
		観光: ["観光", "ミュージアム", "街歩き"],
		ショッピング: ["ショッピング", "セレクトショップ", "マーケット"],
		アクティビティ: ["アウトドア", "体験", "スポーツ"],
	};
	const purposeTags = choice.selected_purpose ? (byPurpose[choice.selected_purpose] ?? ["観光", "街歩き"]) : ["観光", "街歩き"];
	const styleTag = condition.spendingStyle === "アクティブ" ? "アウトドア" : "ゆったり";
	return Array.from(new Set([purposeTags[0], purposeTags[1], styleTag, (choice.selected_area ?? "街歩き")])).slice(0, 3);
}

// --- レーダーチャートコンポーネント（濃い緑・視認性最大版 + オレンジ点線） ---
function RadarChart({
	axes,
	series,
	axisAverages,
}: {
	axes: RadarAxis[];
	series: MemberRadarSeries[];
	axisAverages: Array<{ label: string; value: number }>;
}) {
	const size = 260;
	const center = size / 2;
	const maxRadius = 92;

	const rings = [1, 2, 3, 4, 5];
	const axisCount = axes.length;

	const strongGreen = "#2D7D76";
	const averageOrange = "#FF8A00";

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

	return (
		<div className="w-full flex justify-center">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="ズレ表示グラフ">
				<defs>
					<filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
						<feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{/* 背景の白い円 */}
				<circle cx={center} cy={center} r={maxRadius} fill="#ffffff" stroke={strongGreen} strokeWidth="3" strokeOpacity="0.7" filter="url(#glow)" />

				{/* 内側の五角形（網目） */}
				{rings.map((ring) => {
					if (ring === 5) return null;
					const points = axes.map((_, index) => {
						const point = toPoint(ring, index);
						return `${point.x},${point.y}`;
					}).join(" ");
					return <polygon key={ring} points={points} fill="none" stroke={strongGreen} strokeOpacity="0.4" strokeWidth="1.5" />;
				})}

				{/* 軸の線 */}
				{axes.map((_, index) => {
					const point = toPoint(5, index);
					return <line key={`axis-${index}`} x1={center} y1={center} x2={point.x} y2={point.y} stroke={strongGreen} strokeOpacity="0.4" strokeWidth="1.2" />;
				})}

				{/* オレンジの点線（全員の平均値） */}
				{axisAverages.length > 0 && (
					<>
						<polygon
							points={axisAverages
								.map((axis, index) => {
									const point = toPoint(axis.value, index);
									return `${point.x},${point.y}`;
								})
								.join(" ")}
							fill="none"
							stroke={averageOrange}
							strokeWidth={2}
							strokeDasharray="5 4"
							strokeLinejoin="round"
						/>
						{axisAverages.map((axis, index) => {
							const point = toPoint(axis.value, index);
							return <circle key={`avg-point-${axis.label}`} cx={point.x} cy={point.y} r={2.6} fill={averageOrange} />;
						})}
					</>
				)}

				{/* メンバーそれぞれのデータ */}
				{series.map((line, index) => {
					const color = radarColors[index % radarColors.length];
					const points = line.values
						.map((value, axisIndex) => {
							const point = toPoint(value, axisIndex);
							return `${point.x},${point.y}`;
						})
						.join(" ");

					return <polygon key={line.id} points={points} fill={color} fillOpacity={line.isSelf ? 0.25 : 0.08} stroke={color} strokeOpacity={line.isSelf ? 1 : 0.7} strokeWidth={line.isSelf ? 2 : 1.2} filter="url(#glow)" />;
				})}

				{/* 真ん中の点 */}
				<circle cx={center} cy={center} r={4} fill={strongGreen} />

				{/* ラベルテキスト */}
				{axes.map((axis, index) => {
					const point = toPoint(5.7, index, false);
					return <text key={`label-${axis.label}`} x={point.x} y={point.y} fontSize="11" fontWeight="800" fill={strongGreen} textAnchor="middle" dominantBaseline="middle">{axis.label}</text>;
				})}
			</svg>
		</div>
	);
}

// --- メインページ ---
export default function GroupResult() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const passcode = params.id;
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [choices, setChoices] = useState<MemberChoice[]>([]);
	const [memberNames, setMemberNames] = useState<Record<string, string>>({});
	const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});
	const [savingCard, setSavingCard] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const cardCaptureRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const load = async () => {
			const supabase = getSupabaseClient();
			const [{ data: authData }, { data: sessionData }] = await Promise.all([
				supabase.auth.getUser(),
				supabase.auth.getSession(),
			]);
			setCurrentUserId(authData.user?.id ?? null);
			const accessToken = sessionData.session?.access_token;

			const { data: groupData, error: groupError } = await supabase.rpc("find_group_by_passcode", {
				input_passcode: passcode,
			});

			if (groupError || !groupData?.[0]) {
				setMessage("グループ情報を取得できませんでした。");
				setLoading(false);
				return;
			}

			if (accessToken) {
				const membersResponse = await fetch("/api/groups/members", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ groupId: groupData[0].group_id }),
				});

				if (membersResponse.ok) {
					const membersResult = (await membersResponse.json()) as { members?: { user_id: string; nickname: string; avatar: string }[] };
					const nextNames = (membersResult.members ?? []).reduce<Record<string, string>>((acc, member) => {
						acc[member.user_id] = member.nickname;
						return acc;
					}, {});
					const nextAvatars = (membersResult.members ?? []).reduce<Record<string, string>>((acc, member) => {
						acc[member.user_id] = member.avatar;
						return acc;
					}, {});
					setMemberNames(nextNames);
					setMemberAvatars(nextAvatars);
				}
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

	const orderedChoices = useMemo(() => {
		if (!currentUserId) {
			return readyChoices;
		}
		const self = readyChoices.filter((choice) => choice.user_id === currentUserId);
		const others = readyChoices.filter((choice) => choice.user_id !== currentUserId);
		return [...self, ...others];
	}, [currentUserId, readyChoices]);

	const parsedConditions = useMemo(() => orderedChoices.map((choice) => parseCondition(choice.selected_value)), [orderedChoices]);
	const spendingStats = useMemo(() => aggregate(parsedConditions.map((item) => item.spendingStyle)), [parsedConditions]);
	const distanceStats = useMemo(() => aggregate(parsedConditions.map((item) => item.distance)), [parsedConditions]);
	const crowdStats = useMemo(() => aggregate(parsedConditions.map((item) => item.crowd)), [parsedConditions]);
	const budgetStats = useMemo(() => aggregate(parsedConditions.map((item) => String(budgetToScale(item.budget)))), [parsedConditions]);
	const timeStats = useMemo(() => aggregate(parsedConditions.map((item) => item.time)), [parsedConditions]);
	const totalVotes = orderedChoices.length;

	const radarSeries = useMemo<MemberRadarSeries[]>(() => {
		return orderedChoices.map((choice, index) => {
			const condition = parsedConditions[index] ?? parseCondition(null);
			const isSelf = choice.user_id === currentUserId;
			const fallbackLabel = `メンバー ${choice.user_id.slice(0, 4)}`;
			const label = isSelf ? "あなた" : memberNames[choice.user_id] ?? fallbackLabel;

			return {
				id: `${choice.user_id}-${index}`,
				userId: choice.user_id,
				label,
				isSelf,
				values: [
					indexFromScale(spendingScale, condition.spendingStyle),
					indexFromScale(distanceScale, condition.distance),
					indexFromScale(crowdScale, condition.crowd),
					budgetToScale(condition.budget),
					indexFromScale(timeScale, condition.time),
				],
			};
		});
	}, [currentUserId, memberNames, orderedChoices, parsedConditions]);

	const axisAverages = useMemo(
		() =>
			radarAxes.map((axis, index) => {
				const sum = radarSeries.reduce((acc, line) => acc + (line.values[index] ?? 0), 0);
				const avg = totalVotes === 0 ? 0 : sum / totalVotes;
				return {
					label: axis.label,
					value: Number(avg.toFixed(1)),
				};
			}),
		[radarSeries, totalVotes],
	);

	const axisMismatchScores = useMemo(() => {
		if (totalVotes === 0) {
			return [] as Array<{ label: string; value: number }>;
		}
		const getMismatchScore = (stats: Record<string, number>) => {
			const top = Math.max(0, ...Object.values(stats));
			return Math.round(100 - (top / totalVotes) * 100);
		};

		return [
			{ label: "過ごし方", value: getMismatchScore(spendingStats) },
			{ label: "距離", value: getMismatchScore(distanceStats) },
			{ label: "人の多さ", value: getMismatchScore(crowdStats) },
			{ label: "予算", value: getMismatchScore(budgetStats) },
			{ label: "時間", value: getMismatchScore(timeStats) },
		];
	}, [budgetStats, crowdStats, distanceStats, spendingStats, timeStats, totalVotes]);

	const maxMismatch = useMemo(() => {
		if (axisMismatchScores.length === 0) {
			return { label: "-", value: 0 };
		}
		return axisMismatchScores.reduce((max, current) => (current.value > max.value ? current : max));
	}, [axisMismatchScores]);

	const mismatchTotal = useMemo(() => {
		if (axisMismatchScores.length === 0) {
			return 0;
		}
		const sum = axisMismatchScores.reduce((acc, axis) => acc + axis.value, 0);
		return Math.round(sum / axisMismatchScores.length);
	}, [axisMismatchScores]);
	const confidenceScore = 100 - mismatchTotal;
	const groupType = getGroupTypeByMismatch(mismatchTotal);
	const recommendations = useMemo(
		() =>
			orderedChoices.map((choice, index) => {
				const isSelf = choice.user_id === currentUserId;
				const fallbackLabel = `メンバー ${choice.user_id.slice(0, 4)}`;
				return {
					id: `${choice.user_id}-${index}`,
					label: isSelf ? "あなた" : memberNames[choice.user_id] ?? fallbackLabel,
					avatar: memberAvatars[choice.user_id] ?? "1",
					tags: buildRecommendationTags(choice, parsedConditions[index] ?? parseCondition(null)),
					color: radarColors[index % radarColors.length],
				};
			}),
		[currentUserId, memberNames, memberAvatars, orderedChoices, parsedConditions],
	);
	const highlightedRecommendation = recommendations[0] ?? null;

	const handleCardGet = async () => {
		if (!cardCaptureRef.current || savingCard) {
			return;
		}

		setSavingCard(true);
		try {
			const dataUrl = await toPng(cardCaptureRef.current, {
				cacheBust: true,
				pixelRatio: 2,
				backgroundColor: "#F9FBF9",
			});

			const link = document.createElement("a");
			link.download = `asobokka-result-${passcode}.png`;
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

	if (!allReady) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="relative min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden select-none">
			<div className="pointer-events-none absolute inset-0 z-10 bg-black/45" aria-hidden />

			<div className="relative w-full z-40">
				<TopLogoBar className="bg-[#D6F8C2]" />
				<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={passcode} />} />
			</div>

			<div className="relative z-40 w-full max-w-md grow px-7 pt-10 pb-20 flex flex-col items-center">
				{message && <p className="mb-4 text-white font-bold bg-red-500/80 px-4 py-2 rounded-xl">{message}</p>}

				{choices.length === 0 ? (
					<p className="bg-white/10 backdrop-blur-md p-6 rounded-2xl text-white font-bold text-center">回答を待っています...</p>
				) : (
					<div className="w-full space-y-6">
						<section className="relative">
							<div className="absolute inset-x-4 top-14 h-4/5 bg-white/25 blur-3xl rounded-[40px]" />
							<p className="relative text-center text-white font-bold mb-4 text-lg drop-shadow-md">今日のあなたたちは</p>

							<div ref={cardCaptureRef} className="relative rounded-[45px] border-[8px] border-white bg-[#F9FBF9] p-7 shadow-2xl">
								<div className="mb-5 flex items-center justify-between">
									<span className="text-2xl font-bold bg-linear-to-r from-[#bb4f4f] via-[#4f8752] to-[#6c57a6] bg-clip-text text-transparent">{groupType}</span>
									<span className="text-xs font-bold text-[#389E95] bg-[#D6F8C2]/60 px-3 py-1 rounded-full">一致 {confidenceScore}%</span>
								</div>

								<RadarChart axes={radarAxes} series={radarSeries} axisAverages={axisAverages} />

								<div className="mt-6 flex gap-2">
									<div className="flex-1 bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
										<p className="text-[8px] text-gray-400 font-bold mb-0.5">ズレ総量</p>
										<p className="text-[13px] font-bold text-[#389E95] leading-none">{mismatchTotal}%</p>
									</div>
									<div className="flex-1 bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
										<p className="text-[8px] text-gray-400 font-bold mb-0.5">安心度</p>
										<p className="text-[13px] font-bold text-[#389E95] leading-none">{confidenceScore}%</p>
									</div>
									<div className="flex-1 bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
										<p className="text-[8px] text-gray-400 font-bold mb-0.5">最大ズレ</p>
										<p className="text-[13px] font-bold text-[#389E95] leading-none">{maxMismatch.label}</p>
									</div>
								</div>

								{highlightedRecommendation && (
									<div className="mt-5 bg-[#F0FAED] border border-[#389E95]/10 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
										<Image src={`/avatars/avatar${highlightedRecommendation.avatar}.svg`} alt="icon" width={36} height={36} className="rounded-full bg-white border border-gray-100" />
										<div className="flex-1 min-w-0">
											<p className="text-[10px] font-bold text-[#389E95] mb-0.5">{highlightedRecommendation.label}のおすすめ</p>
											<p className="text-xs text-[#5A5A5A] font-medium truncate">{highlightedRecommendation.tags.join("、")}</p>
										</div>
									</div>
								)}
							</div>
						</section>

						<div className="bg-[#52A399]/95 backdrop-blur-md rounded-[35px] p-3.5 shadow-xl flex gap-3 border-t border-white/25">
							<button onClick={() => void handleCardGet()} disabled={savingCard} className="flex-1 bg-white rounded-2xl py-3.5 font-bold text-[#389E95] active:scale-95 transition-all shadow-sm">
								{savingCard ? "保存中..." : "カードゲット"}
							</button>
							<Link href={`/groups/${passcode}/result/suggestion`} className="flex-1 bg-white rounded-2xl py-3.5 font-bold text-[#389E95] text-center active:scale-95 transition-all shadow-md">
								提案スタート
							</Link>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}