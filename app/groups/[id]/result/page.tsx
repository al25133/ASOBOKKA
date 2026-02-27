// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountMenu, HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberChoice = {
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
};

type RadarMetric = {
	label: string;
	value: number;
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

function budgetToRangeLabel(budget: number | null) {
	if (budget === null) {
		return null;
	}
	if (budget < 3000) {
		return "〜2999円";
	}
	if (budget < 5000) {
		return "3000-4999円";
	}
	if (budget < 8000) {
		return "5000-7999円";
	}
	return "8000円〜";
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

function getMismatchScore(stats: Record<string, number>, total: number) {
	if (!total) {
		return 0;
	}
	const top = Math.max(0, ...Object.values(stats));
	return Math.round(100 - (top / total) * 100);
}

function RadarChart({ metrics }: { metrics: RadarMetric[] }) {
	const size = 260;
	const center = size / 2;
	const maxRadius = 92;

	const rings = [0.25, 0.5, 0.75, 1];
	const axisCount = metrics.length;

	const angleAt = (index: number) => ((Math.PI * 2) / axisCount) * index - Math.PI / 2;
	const toPoint = (valueRate: number, index: number) => {
		const angle = angleAt(index);
		const radius = maxRadius * valueRate;
		return {
			x: center + Math.cos(angle) * radius,
			y: center + Math.sin(angle) * radius,
		};
	};

	const polygonPoints = metrics
		.map((metric, index) => {
			const point = toPoint(metric.value / 100, index);
			return `${point.x},${point.y}`;
		})
		.join(" ");

	return (
		<div className="w-full flex justify-center">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="ズレ表示グラフ">
				{rings.map((ring) => {
					const points = metrics
						.map((_, index) => {
							const point = toPoint(ring, index);
							return `${point.x},${point.y}`;
						})
						.join(" ");
					return <polygon key={ring} points={points} fill="none" stroke="#389E95" strokeOpacity="0.28" strokeWidth={1.5} />;
				})}

				{metrics.map((_, index) => {
					const point = toPoint(1, index);
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

				<polygon points={polygonPoints} fill="#389E95" fillOpacity="0.35" stroke="#389E95" strokeWidth={2} />
				<circle cx={center} cy={center} r={4} fill="#389E95" />

				{metrics.map((metric, index) => {
					const point = toPoint(1.12, index);
					return (
						<text
							key={`label-${metric.label}`}
							x={point.x}
							y={point.y}
							fontSize="12"
							fontWeight="700"
							fill="#389E95"
							textAnchor="middle"
							dominantBaseline="middle"
						>
							{metric.label}
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
	const [loading, setLoading] = useState(true);
	const [choices, setChoices] = useState<MemberChoice[]>([]);
	const [message, setMessage] = useState<string | null>(null);

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

	const parsedConditions = useMemo(() => choices.map((choice) => parseCondition(choice.selected_value)), [choices]);
	const spendingStats = useMemo(() => aggregate(parsedConditions.map((item) => item.spendingStyle)), [parsedConditions]);
	const distanceStats = useMemo(() => aggregate(parsedConditions.map((item) => item.distance)), [parsedConditions]);
	const crowdStats = useMemo(() => aggregate(parsedConditions.map((item) => item.crowd)), [parsedConditions]);
	const budgetStats = useMemo(() => aggregate(parsedConditions.map((item) => budgetToRangeLabel(item.budget))), [parsedConditions]);
	const timeStats = useMemo(() => aggregate(parsedConditions.map((item) => item.time)), [parsedConditions]);
	const totalVotes = choices.length;

	const radarMetrics = useMemo<RadarMetric[]>(
		() => [
			{ label: "過ごし方", value: getMismatchScore(spendingStats, totalVotes) },
			{ label: "距離", value: getMismatchScore(distanceStats, totalVotes) },
			{ label: "人の多さ", value: getMismatchScore(crowdStats, totalVotes) },
			{ label: "予算", value: getMismatchScore(budgetStats, totalVotes) },
			{ label: "時間", value: getMismatchScore(timeStats, totalVotes) },
		],
		[budgetStats, crowdStats, distanceStats, spendingStats, timeStats, totalVotes],
	);

	const mismatchTotal = useMemo(() => {
		if (radarMetrics.length === 0) {
			return 0;
		}
		const sum = radarMetrics.reduce((acc, metric) => acc + metric.value, 0);
		return Math.round(sum / radarMetrics.length);
	}, [radarMetrics]);
	const confidenceScore = 100 - mismatchTotal;
	const groupType = getGroupTypeByMismatch(mismatchTotal);
	const recommendations = useMemo(
		() => choices.map((choice, index) => ({ id: index + 1, tags: buildRecommendationTags(choice, parsedConditions[index] ?? parseCondition(null)) })),
		[choices, parsedConditions],
	);

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
							<div className="relative rounded-[30px] border-2 border-[#389E95] bg-[#F9FBF9] p-5 shadow-[0_0_24px_rgba(255,255,255,0.85)]">
								<div className="mb-3 flex items-center justify-between text-sm font-bold text-[#389E95]">
									<span>{groupType}</span>
									<span>一致 {confidenceScore}%</span>
								</div>
								<RadarChart metrics={radarMetrics} />
								<div className="mt-4 grid grid-cols-2 gap-2 text-sm">
									<div className="rounded-xl bg-white border border-[#389E95]/20 px-3 py-2.5 text-[#5A5A5A] flex items-center justify-between">
										<span>ズレ総量</span>
										<span className="font-bold text-[#389E95]">{mismatchTotal}%</span>
									</div>
									<div className="rounded-xl bg-white border border-[#389E95]/20 px-3 py-2.5 text-[#5A5A5A] flex items-center justify-between">
										<span>安心度</span>
										<span className="font-bold text-[#389E95]">{confidenceScore}%</span>
									</div>
								</div>

								<div className="mt-3 space-y-2">
									{recommendations.map((recommendation) => (
										<div key={recommendation.id} className="rounded-xl bg-white border border-[#389E95]/20 px-3 py-2.5">
											<p className="text-[11px] font-bold text-[#389E95] mb-1">メンバー{recommendation.id}のおすすめ</p>
											<p className="text-xs text-[#5A5A5A]">{recommendation.tags.join("、")}</p>
										</div>
									))}
								</div>
							</div>
						</section>

						<div className="w-full bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3">
							<button type="button" className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center active:scale-95 transition-transform">
								<span className="text-[#389E95] font-bold">カードゲット</span>
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
