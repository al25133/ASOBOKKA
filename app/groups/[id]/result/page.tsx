// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AccountMenu, HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberChoice = {
	user_id: string;
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
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

type GroupMemberProfile = {
	user_id: string;
	nickname: string;
	avatar: string;
};

type ParsedCondition = {
	spendingStyle: string | null;
	distance: string | null;
	crowd: string | null;
	budget: number | null;
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

const spendingScale = ["のんびり", "ゆったり", "おまかせ", "食べ歩き", "アクティブ"];
const distanceScale = ["徒歩圏", "電車1駅", "電車2〜3駅", "30分以内", "どこでも"];
const crowdScale = ["とても少なめ", "少なめ", "ふつう", "にぎやか", "とてもにぎやか"];
const timeScale = ["1時間以内", "2時間くらい", "3時間くらい", "半日", "終日"];
const radarAxes: RadarAxis[] = [
	{ label: "過ごし方", key: "spendingStyle" },
	{ label: "距離", key: "distance" },
	{ label: "人の多さ", key: "crowd" },
	{ label: "予算", key: "budget" },
	{ label: "時間", key: "time" },
];

const radarColors = ["#389E95", "#52A399", "#5A7C55", "#5A5A5A"];

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

function buildRecommendationTags(choice: MemberChoice, condition: ParsedCondition) {
	const byPurpose: Record<string, string[]> = {
		ごはん: ["食べ歩き", "ローカルグルメ", "カフェ巡り"],
		カフェ: ["ミュージアム", "ブックカフェ", "スイーツ"],
		観光: ["観光", "ミュージアム", "街歩き"],
		ショッピング: ["ショッピング", "セレクトショップ", "マーケット"],
		アクティビティ: ["アウトドア", "体験", "スポーツ"],
	};

	const purposeTags = choice.selected_purpose ? (byPurpose[choice.selected_purpose] ?? ["観光", "ミュージアム", "アウトドア"]) : ["観光", "ミュージアム", "アウトドア"];
	const styleTag = condition.spendingStyle === "ゆったり" || condition.spendingStyle === "のんびり"
		? "ミュージアム"
		: condition.spendingStyle === "アクティブ"
			? "アウトドア"
			: "観光";
	const areaTag = choice.selected_area ?? "街歩き";

	return Array.from(new Set([purposeTags[0], purposeTags[1], styleTag, areaTag])).slice(0, 3);
}

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
				{rings.map((ring) => {
					const points = axes
						.map((_, index) => {
							const point = toPoint(ring, index);
							return `${point.x},${point.y}`;
						})
						.join(" ");
					return <polygon key={ring} points={points} fill="none" stroke="#389E95" strokeOpacity="0.28" strokeWidth={1.5} />;
				})}

				{axes.map((_, index) => {
					const point = toPoint(5, index);
					return (
						<line
							key={`axis-${index}`}
							x1={center}
							y1={center}
							x2={point.x}
							y2={point.y}
							stroke="#389E95"
							strokeOpacity="0.35"
						/>
					);
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
							fillOpacity={line.isSelf ? 0.28 : 0.12}
							stroke={color}
							strokeOpacity={line.isSelf ? 1 : 0.7}
							strokeWidth={line.isSelf ? 2.5 : 2}
						/>
					);
				})}

				{axisAverages.length > 0 ? (
					<>
						<polygon
							points={axisAverages
								.map((axis, index) => {
									const point = toPoint(axis.value, index);
									return `${point.x},${point.y}`;
								})
								.join(" ")}
							fill="none"
							stroke="#FF8A00"
							strokeWidth={2}
							strokeDasharray="5 4"
							strokeLinejoin="round"
						/>
						{axisAverages.map((axis, index) => {
							const point = toPoint(axis.value, index);
							return <circle key={`avg-point-${axis.label}`} cx={point.x} cy={point.y} r={2.6} fill="#FF8A00" />;
						})}
					</>
				) : null}
				<circle cx={center} cy={center} r={4} fill="#389E95" />

				{axes.map((axis, index) => {
					const point = toPoint(5.7, index, false);
					return (
						<text
							key={`label-${axis.label}`}
							x={point.x}
							y={point.y}
							fontSize="12"
							fontWeight="700"
							fill="#389E95"
							textAnchor="middle"
							dominantBaseline="middle"
						>
							{axis.label}
						</text>
					);
				})}
			</svg>
		</div>
	);
}

export default function GroupResult() {
	const params = useParams<{ id: string }>();
	const passcode = params.id;
	const [avatarId, setAvatarId] = useState("1");
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [choices, setChoices] = useState<MemberChoice[]>([]);
	const [memberNames, setMemberNames] = useState<Record<string, string>>({});
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
			const avatar = authData.user?.user_metadata?.avatar;
			if (typeof avatar === "number" || typeof avatar === "string") {
				setAvatarId(String(avatar));
			}
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
					const membersResult = (await membersResponse.json()) as { members?: GroupMemberProfile[] };
					const nextNames = (membersResult.members ?? []).reduce<Record<string, string>>((acc, member) => {
						acc[member.user_id] = member.nickname;
						return acc;
					}, {});
					setMemberNames(nextNames);
				}
			}

			const { data, error } = await supabase
				.from("group_members")
				.select("user_id, selected_area, selected_purpose, selected_value")
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

	const orderedChoices = useMemo(() => {
		if (!currentUserId) {
			return choices;
		}
		const self = choices.filter((choice) => choice.user_id === currentUserId);
		const others = choices.filter((choice) => choice.user_id !== currentUserId);
		return [...self, ...others];
	}, [choices, currentUserId]);

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
					tags: buildRecommendationTags(choice, parsedConditions[index] ?? parseCondition(null)),
				};
			}),
		[currentUserId, memberNames, orderedChoices, parsedConditions],
	);

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

	return (
		<main className="relative min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
			<div className="pointer-events-none absolute inset-0 z-10 bg-black/55" aria-hidden />

			<div className="relative w-full">
				<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />
				<HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />
				<div className="pointer-events-none absolute inset-0 z-30 bg-black/35" aria-hidden />
			</div>

			<div className="relative z-40 w-full max-w-112.5 grow px-7 pt-10 pb-16 flex items-start justify-center">
				{message ? (
					<p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{message}
					</p>
				) : null}

				{choices.length === 0 ? (
					<p className="rounded-2xl border border-[#389E95]/20 bg-[#F9FBF9] p-4 text-sm text-[#5A7C55]">
						まだメンバーの回答がありません。
					</p>
				) : (
					<div className="w-full max-w-md space-y-5">
						<section className="relative pt-2">
							<div className="absolute left-3 right-3 top-12 h-[80%] rounded-[30px] bg-white/50 blur-lg" aria-hidden />
							<p className="relative text-center text-base font-extrabold text-white mb-3">今日のあなたたちは</p>
							<div ref={cardCaptureRef} className="relative rounded-[30px] border-2 border-[#389E95] bg-[#F9FBF9] p-5 shadow-[0_0_24px_rgba(255,255,255,0.85)]">
								<div className="mb-3 flex items-center justify-between text-sm font-bold text-[#389E95]">
									<span>{groupType}</span>
									<span>一致 {confidenceScore}%</span>
								</div>
								<RadarChart axes={radarAxes} series={radarSeries} axisAverages={axisAverages} />
								<div className="mt-3 flex flex-wrap gap-2">
									{radarSeries.map((line, index) => {
										const color = radarColors[index % radarColors.length];
										return (
											<div key={line.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#389E95]/20 bg-white px-2.5 py-1 text-[11px] text-[#5A5A5A]">
												<span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity: line.isSelf ? 1 : 0.65 }} />
												<span className={line.isSelf ? "font-bold text-[#389E95]" : ""}>{line.label}</span>
											</div>
										);
									})}
								</div>
								<div className="mt-4 flex gap-2 text-[10px] sm:text-xs">
									<div className="min-w-0 flex-1 rounded-xl bg-white border border-[#389E95]/20 px-2 py-1.5 text-[#5A5A5A] flex items-center justify-between gap-1">
										<span>ズレ総量</span>
										<span className="font-bold text-[#389E95] whitespace-nowrap">{mismatchTotal}%</span>
									</div>
									<div className="min-w-0 flex-1 rounded-xl bg-white border border-[#389E95]/20 px-2 py-1.5 text-[#5A5A5A] flex items-center justify-between gap-1">
										<span>安心度</span>
										<span className="font-bold text-[#389E95] whitespace-nowrap">{confidenceScore}%</span>
									</div>
									<div className="min-w-0 flex-1 rounded-xl bg-white border border-[#389E95]/20 px-2 py-1.5 text-[#5A5A5A] flex items-center justify-between gap-1">
										<span>最大ズレ</span>
										<span className="font-bold text-[#389E95] whitespace-nowrap">{maxMismatch.label} {maxMismatch.value}%</span>
									</div>
								</div>

								<div className="mt-3 space-y-2">
									{recommendations.map((recommendation) => (
										<div key={recommendation.id} className="rounded-xl bg-white border border-[#389E95]/20 px-3 py-2.5">
											<p className="text-[11px] font-bold text-[#389E95] mb-1">{recommendation.label}のおすすめ</p>
											<p className="text-xs text-[#5A5A5A]">{recommendation.tags.join("、")}</p>
										</div>
									))}
								</div>
							</div>
						</section>

						<div className="w-full bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3">
							<button
								type="button"
								onClick={() => void handleCardGet()}
								disabled={savingCard}
								className={`flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center transition-transform ${savingCard ? "opacity-60" : "active:scale-95"}`}
							>
								<span className="text-[#389E95] font-bold">{savingCard ? "保存中..." : "カードゲット"}</span>
							</button>
							<Link
								href={`/groups/${passcode}/result/suggestion`}
								className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center active:scale-95 transition-transform"
							>
								<span className="text-[#389E95] font-bold">提案スタート</span>
							</Link>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
