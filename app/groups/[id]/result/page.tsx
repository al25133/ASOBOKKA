"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import { AccountMenu } from "@/components/ui/account-menu";
import { TopLogoBar } from "@/components/ui/app-header";
import { getSupabaseClient } from "@/lib/supabase/client";

// --- 型定義 ---
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

type ParsedCondition = {
    spendingStyle: string | null;
    distance: string | null;
    crowd: string | null;
    budget: number | null;
    time: string | null;
};

// --- ヘルパー関数 ---
function aggregate(items: Array<string | null>) {
    return items.reduce<Record<string, number>>((acc, item) => {
        if (!item) return acc;
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
    if (!raw) return { spendingStyle: null, distance: null, crowd: null, budget: null, time: null };
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
            if (!budgetRaw) return null;
            const normalized = Number(budgetRaw.replace(/[^0-9]/g, ""));
            return Number.isFinite(normalized) ? normalized : null;
        })(),
        time: getPart("時間"),
    };
}

function indexFromScale(scale: string[], value: string | null) {
    if (!value) return 3;
    const index = scale.findIndex((item) => item === value);
    return index >= 0 ? index + 1 : 3;
}

function budgetToScale(budget: number | null) {
    if (budget === null) return 3;
    if (budget <= 20000) return 1;
    if (budget <= 40000) return 2;
    if (budget <= 60000) return 3;
    if (budget <= 80000) return 4;
    return 5;
}

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

// --- レーダーチャートコンポーネント（ぼかし・透明版） ---
// --- レーダーチャートコンポーネント（濃い緑・視認性最大版 + 復活オレンジ点線） ---
function RadarChart({
    axes,
    series,
    axisAverages, // ✅ 他のデータと同様に、平均値も受け取るようにしました
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

    // ✅ 濃い緑色を定義
    const strongGreen = "#2D7D76"; 
    // ✅ 平均値用のオレンジ色を定義
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
                            {/* 🟢 影の色も濃く調整 */}
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

                {/* 🟠 ✅ 【修正ポイント】オレンジの点線（全員の平均値）を描画します */}
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
                            stroke={averageOrange} // ✅ オレンジ色
                            strokeWidth={2}
                            strokeDasharray="5 4"   // ✅ 点線にする設定
                            strokeLinejoin="round"
                        />
                        {axisAverages.map((axis, index) => {
                            const point = toPoint(axis.value, index);
                            // ✅ 平均値の点もオレンジで描画
                            return <circle key={`avg-point-${axis.label}`} cx={point.x} cy={point.y} r={2.6} fill={averageOrange} />;
                        })}
                    </>
                )}

                {/* メンバーそれぞれのデータ（ふんわり） */}
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
    const passcode = params.id;
    const [avatarId, setAvatarId] = useState("1");
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
            const avatar = authData.user?.user_metadata?.avatar;
            if (avatar) setAvatarId(String(avatar));
            const accessToken = sessionData.session?.access_token;

            const { data: groupData } = await supabase.rpc("find_group_by_passcode", { input_passcode: passcode });
            if (!groupData?.[0]) {
                setMessage("グループが見つかりません。");
                setLoading(false);
                return;
            }

            if (accessToken) {
                const res = await fetch("/api/groups/members", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ groupId: groupData[0].group_id }),
                });
                if (res.ok) {
                    const result = (await res.json()) as { members?: { user_id: string; nickname: string; avatar: string }[] };
                    setMemberNames((result.members ?? []).reduce<Record<string, string>>((acc, m) => ({ ...acc, [m.user_id]: m.nickname }), {}));
                    setMemberAvatars((result.members ?? []).reduce<Record<string, string>>((acc, m) => ({ ...acc, [m.user_id]: m.avatar }), {}));
                }
            }

            const { data } = await supabase.from("group_members").select("user_id, selected_area, selected_purpose, selected_value").eq("group_id", groupData[0].group_id);
            setChoices(data ?? []);
            setLoading(false);
        };
        load();
    }, [passcode]);

    const orderedChoices = useMemo(() => {
        if (!currentUserId) return choices;
        return [...choices.filter(c => c.user_id === currentUserId), ...choices.filter(c => c.user_id !== currentUserId)];
    }, [choices, currentUserId]);

    const parsedConditions = useMemo(() => orderedChoices.map(c => parseCondition(c.selected_value)), [orderedChoices]);
    const spendingStats = useMemo(() => aggregate(parsedConditions.map(p => p.spendingStyle)), [parsedConditions]);
    const distanceStats = useMemo(() => aggregate(parsedConditions.map(p => p.distance)), [parsedConditions]);
    const crowdStats = useMemo(() => aggregate(parsedConditions.map(p => p.crowd)), [parsedConditions]);
    const budgetStats = useMemo(() => aggregate(parsedConditions.map(p => String(budgetToScale(p.budget)))), [parsedConditions]);
    const timeStats = useMemo(() => aggregate(parsedConditions.map(p => p.time)), [parsedConditions]);
    
    const radarSeries = useMemo(() => orderedChoices.map((choice, i) => ({
        id: choice.user_id,
        userId: choice.user_id,
        label: choice.user_id === currentUserId ? "あなた" : memberNames[choice.user_id] ?? "メンバー",
        isSelf: choice.user_id === currentUserId,
        values: [
            indexFromScale(spendingScale, parsedConditions[i].spendingStyle),
            indexFromScale(distanceScale, parsedConditions[i].distance),
            indexFromScale(crowdScale, parsedConditions[i].crowd),
            budgetToScale(parsedConditions[i].budget),
            indexFromScale(timeScale, parsedConditions[i].time),
        ]
    })), [orderedChoices, currentUserId, memberNames, parsedConditions]);

    const axisAverages = useMemo(() => radarAxes.map((axis, idx) => ({
        label: axis.label,
        value: Number((radarSeries.reduce((acc, s) => acc + s.values[idx], 0) / (radarSeries.length || 1)).toFixed(1))
    })), [radarSeries]);

    const mismatchTotal = useMemo(() => {
        const getM = (s: Record<string, number>) => Math.round(100 - (Math.max(0, ...Object.values(s)) / (orderedChoices.length || 1)) * 100);
        return Math.round((getM(spendingStats) + getM(distanceStats) + getM(crowdStats) + getM(budgetStats) + getM(timeStats)) / 5);
    }, [spendingStats, distanceStats, crowdStats, budgetStats, timeStats, orderedChoices.length]);

    const confidenceScore = 100 - mismatchTotal;
    const groupType = getGroupTypeByMismatch(mismatchTotal);
    const maxMismatch = useMemo(() => {
        const scores = [
            { label: "過ごし方", val: spendingStats }, { label: "距離", val: distanceStats },
            { label: "人の多さ", val: crowdStats }, { label: "予算", val: budgetStats }, { label: "時間", val: timeStats }
        ].map(s => ({ label: s.label, score: Math.round(100 - (Math.max(0, ...Object.values(s.val)) / (orderedChoices.length || 1)) * 100) }));
        return scores.reduce((a, b) => a.score > b.score ? a : b, scores[0]);
    }, [spendingStats, distanceStats, crowdStats, budgetStats, timeStats, orderedChoices.length]);

    const highlightedRecommendation = orderedChoices[0] ? {
        label: orderedChoices[0].user_id === currentUserId ? "あなた" : memberNames[orderedChoices[0].user_id] ?? "メンバー",
        avatar: memberAvatars[orderedChoices[0].user_id] ?? "1",
        tags: buildRecommendationTags(orderedChoices[0], parsedConditions[0]),
        color: radarColors[0]
    } : null;

    const handleCardGet = async () => {
        if (!cardCaptureRef.current || savingCard) return;
        setSavingCard(true);
        try {
            const dataUrl = await toPng(cardCaptureRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#F9FBF9" });
            const link = document.createElement("a");
            link.download = `asobokka-${passcode}.png`;
            link.href = dataUrl;
            link.click();
        } finally { setSavingCard(false); }
    };

    if (loading) return <main className="min-h-screen bg-[#D6F8C2]" />;

    return (
        <main className="relative min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden select-none">
            <div className="pointer-events-none absolute inset-0 z-10 bg-black/45" aria-hidden />

            <div className="relative w-full z-40">
                <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />
                <header className="w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
                    <Link href="/groups"><Image src="/homelogo.svg" alt="home" width={32} height={32} /></Link>
                    <div className="ml-auto"><AccountMenu avatarId={avatarId} /></div>
                </header>
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
                                    {[{ l: "ズレ", v: `${mismatchTotal}%` }, { l: "安心度", v: `${confidenceScore}%` }, { l: "最大ズレ", v: maxMismatch.label }].map(s => (
                                        <div key={s.l} className="flex-1 bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
                                            <p className="text-[8px] text-gray-400 font-bold mb-0.5">{s.l}</p>
                                            <p className="text-[13px] font-bold text-[#389E95] leading-none">{s.v}</p>
                                        </div>
                                    ))}
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
                            <button onClick={() => void handleCardGet()} className="flex-1 bg-white rounded-2xl py-3.5 font-bold text-[#389E95] active:scale-95 transition-all shadow-sm">
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