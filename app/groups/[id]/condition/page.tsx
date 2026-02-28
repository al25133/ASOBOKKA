"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TopLogoBar } from "@/components/ui/app-header";
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
    if (!raw) return { spendingStyle: null, distance: null, crowd: null, time: null, budget: null };
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
            if (!budgetRaw) return null;
            const normalized = Number(budgetRaw.replace(/[^0-9]/g, ""));
            return Number.isFinite(normalized) ? normalized : null;
        })(),
    };
}

function indexFromScale(scale: string[], value: string | null) {
    if (!value) return 3;
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

    const getCircleSize = (val: number) => {
        switch (val) {
            case 1: case 5: return "w-9 h-9";
            case 2: case 4: return "w-7 h-7";
            case 3: return "w-5 h-5";
            default: return "w-7 h-7";
        }
    };

    const conditionValue = useMemo(
        () => `過ごし方:${spendingScale[selections.end - 1]} / 距離:${distanceScale[selections.stance - 1]} / 人の多さ:${crowdScale[selections.owd - 1]} / 時間:${timeScale[selections.me - 1]} / 予算:${selections.dget}円`,
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

            if (joinResult.data) {
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
            }
            setInitializing(false);
        };
        void initialize();
    }, [passcode, router]);

    const saveCondition = async () => {
        if (!groupId || !userId) return;
        setSaving(true);
        const supabase = getSupabaseClient();
        const { error } = await supabase.from("group_members").upsert(
            { group_id: groupId, user_id: userId, selected_value: conditionValue, is_ready: true },
            { onConflict: "group_id,user_id" },
        );
        setSaving(false);
        if (error) {
            setMessage("保存に失敗しました。");
            return;
        }
        router.push(`/groups/${passcode}/result`);
    };

    if (initializing) return <div className="pt-20 text-[#389E95] font-bold text-center">準備中...</div>;

    const conditionItems = [
        { key: "end", labelL: "のんびり", labelR: "活発" },
        { key: "stance", labelL: "近め", labelR: "遠くてもいい" },
        { key: "owd", labelL: "静か", labelR: "にぎやか" },
        { key: "me", labelL: "短時間", labelR: "半日以上" },
    ] as const;

    return (
        <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-10 px-6 pb-44 select-none">
            <div className="w-full flex flex-col items-center mb-10 px-4 relative shrink-0">
                <div className="absolute top-1.75 left-0 w-full h-0.5 flex items-center px-4">
                    <div className="bg-[#389E95] w-full h-full transition-all duration-500"></div>
                </div>

                <div className="w-full flex justify-between items-start relative min-h-12.5">
                    {["ホーム", "場所", "目的", "条件"].map((label, i) => (
                        <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                            {i === 3 && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                                    <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
                                </div>
                            )}
                            <div className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 bg-[#389E95] border-[#389E95] scale-110 shadow-md"></div>
                            <span className="text-[10px] font-bold text-[#389E95]">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-10 w-full">
                {conditionItems.map((item) => (
                    <div key={item.key} className="flex flex-col gap-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-bold text-[#389E95] tracking-tight">{item.labelL}</span>
                            <span className="text-sm font-bold text-[#389E95] tracking-tight">{item.labelR}</span>
                        </div>
                        <div className="flex justify-between items-center relative h-10 px-1">
                            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#389E95]/20 -translate-y-1/2 z-0"></div>
                            {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setSelections({ ...selections, [item.key]: val })}
                                    className={`relative z-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${getCircleSize(val)} ${selections[item.key] === val ? "bg-[#389E95] border-[#389E95] scale-110 shadow-lg" : "bg-white border-[#389E95]/40"}`}
                                >
                                    <div className={`rounded-full ${selections[item.key] === val ? "w-2.5 h-2.5 bg-[#389E95]" : "w-1.5 h-1.5 bg-[#389E95]/20"}`}></div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col gap-4 mt-4">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-sm font-bold text-[#389E95]">予算</span>
                        <span className="text-lg font-bold text-[#389E95] leading-none">¥{selections.dget.toLocaleString()} <span className="text-xs">以内</span></span>
                    </div>
                    <div className="relative px-1 flex items-center">
                        <input
                            type="range" min="0" max="50000" step="1000"
                            value={selections.dget}
                            onChange={(e) => setSelections({ ...selections, dget: parseInt(e.target.value, 10) })}
                            className="w-full h-2 bg-white rounded-full appearance-none cursor-pointer accent-[#389E95] shadow-inner"
                            style={{ backgroundImage: `linear-gradient(to right, #389E95 ${(selections.dget / 50000) * 100}%, transparent 0%)` }}
                        />
                    </div>
                    <div className="flex justify-between px-1 opacity-50 text-[10px] font-bold text-[#389E95]">
                        <span>¥0</span><span>¥50,000+</span>
                    </div>
                </div>
            </div>

            {message && <p className="w-full mt-3 text-sm text-[#5A5A5A] text-center font-bold">{message}</p>}

            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/10">
                <Link href={`/groups/${passcode}/purpose`} className="flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center active:scale-95 shadow-sm text-[#389E95] font-bold tracking-widest text-base">
                    戻る
                </Link>
                <button
                    type="button" onClick={() => void saveCondition()} disabled={saving}
                    className={`flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center transition-all text-[#389E95] font-bold tracking-widest text-base ${saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
                >
                    結果表示
                </button>
            </div>
        </div>
    );
}

function GroupConditionPageContent() {
    const params = useParams<{ id: string }>();

    return (
        <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-x-hidden select-none">
            <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />
            <header className="relative z-30 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
                <Link href="/groups">
                    <Image src="/homelogo.svg" alt="home" width={32} height={32} />
                </Link>
                <div className="ml-auto">
                    <TeamMembersHeader passcode={params.id} />
                </div>
            </header>
            <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
                <ConditionSelectionContent passcode={params.id} />
            </Suspense>
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