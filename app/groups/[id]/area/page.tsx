"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { areaData } from "@/datas/area";

function AreaSelectionContent({ passcode }: { passcode: string }) {
    const router = useRouter();
    const [step, setStep] = useState<"region" | "pref" | "area" | "result">("region");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedPref, setSelectedPref] = useState("");
    const [selectedArea, setSelectedArea] = useState("");
    const [groupId, setGroupId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // 🚩 プログレスバーの設定
    const steps = ["ホーム", "場所", "目的", "条件"];
    const currentStepIndex = 1; // 「場所」

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
            }
        };
        void initialize();
    }, [passcode, router]);

    const saveArea = async (nextArea: string) => {
        if (!groupId || !userId) return;
        setSaving(true);
        const supabase = getSupabaseClient();
        await supabase.from("group_members").upsert(
            { group_id: groupId, user_id: userId, selected_area: nextArea, is_ready: false },
            { onConflict: "group_id,user_id" },
        );
        setSaving(false);
    };

    const renderContent = () => {
        switch (step) {
            case "region":
                return (
                    <div className="w-full bg-white border-2 border-[#389E95]/10 rounded-[30px] p-6 shadow-sm">
                        <p className="text-[#BABABA] text-sm font-black mb-6 text-center tracking-widest uppercase">地方を選択</p>
                        <div className="grid grid-cols-1 gap-3">
                            {Object.keys(areaData).map((region) => {
                                const isTarget = region === "関東";
                                return (
                                    <button
                                        key={region}
                                        onClick={() => { setSelectedRegion(region); setStep("pref"); }}
                                        className={`w-full text-left text-lg font-bold py-5 px-6 rounded-2xl flex justify-between items-center transition-all shadow-sm
                                            ${isTarget ? "text-[#5A5A5A] bg-[#D6F8C2]/20 active:scale-95" : "text-[#BABABA]/60 bg-gray-50/50 opacity-70"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {region}
                                            {!isTarget && <span className="text-[9px] bg-white/80 text-gray-400 px-2 py-0.5 rounded border border-gray-100 font-black">Coming Soon</span>}
                                        </div>
                                        <span className={`${isTarget ? "text-[#389E95]" : "text-[#BABABA]/40"} text-xl`}>›</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case "pref":
                return (
                    <div className="w-full bg-white border-2 border-[#389E95]/10 rounded-[30px] p-6 shadow-sm">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-black tracking-widest uppercase">{selectedRegion}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-100 overflow-y-auto pr-1">
                            {Object.keys(areaData[selectedRegion]).map((pref) => {
                                const isTarget = pref === "東京";
                                return (
                                    <button
                                        key={pref}
                                        onClick={() => { setSelectedPref(pref); setStep("area"); }}
                                        className={`text-lg font-bold py-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1
                                            ${isTarget ? "text-[#5A5A5A] border-[#389E95]/10 bg-white shadow-sm active:bg-[#D6F8C2]" : "text-[#BABABA]/60 border-transparent bg-gray-50/50 opacity-70"}`}
                                    >
                                        {pref}
                                        {!isTarget && <span className="text-[8px] text-gray-400 font-black opacity-70">Coming Soon</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case "area":
                return (
                    <div className="w-full bg-white border-2 border-[#389E95]/10 rounded-[30px] p-6 shadow-sm">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-black tracking-widest uppercase">{selectedPref}</p>
                        </div>
                        <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                            {areaData[selectedRegion][selectedPref].map((area) => {
                                const isEnabled = selectedPref === "東京";
                                return (
                                    <button
                                        key={area}
                                        disabled={!isEnabled}
                                        onClick={() => {
                                            setSelectedArea(area);
                                            setStep("result");
                                            void saveArea(area);
                                        }}
                                        className={`w-full text-left text-base font-bold py-5 px-4 rounded-xl flex items-center justify-between transition-all
                                            ${isEnabled 
                                                ? "text-[#5A5A5A] border-b-2 border-[#D6F8C2]/30 active:bg-[#D6F8C2]/10" 
                                                : "text-[#BABABA]/40 bg-gray-50/30 cursor-not-allowed border-none opacity-60"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${isEnabled ? "border-[#389E95]/30" : "border-gray-200"}`}>
                                                {isEnabled && <div className="w-2 h-2 rounded-full bg-[#389E95]"></div>}
                                            </span>
                                            {area}
                                        </div>
                                        {!isEnabled && <span className="text-[10px] bg-gray-200 text-gray-400 px-2 py-0.5 rounded font-black tracking-tighter">Coming Soon</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case "result":
                return (
                    <div className="w-full flex flex-col items-center justify-center pt-4 pb-10">
                        {/* 💡 修正：カード上部にあった緑のラインを消して、スッキリさせました */}
                        <div className="w-full bg-white border-[6px] border-[#389E95] rounded-[45px] p-10 flex flex-col items-center gap-5 shadow-2xl text-center relative overflow-hidden">
                            <span className="text-6xl mb-2 drop-shadow-sm">📍</span>
                            <div className="flex flex-col gap-2">
                                <span className="text-[#BABABA] text-base font-bold tracking-widest uppercase">{selectedPref}</span>
                                <span className="text-[#389E95] text-3xl font-black tracking-wider leading-tight">{selectedArea}</span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-full flex flex-col items-center select-none relative bg-white">
            
            {/* 🟢 1. プログレスバーエリア */}
            <div className="w-full bg-[#D6F8C2] pt-10 pb-4 px-10 flex flex-col items-center relative z-20">
                <div className="w-full max-w-80 flex justify-between items-start relative shrink-0 min-h-[50px]">
                    <div className="absolute top-[7px] left-0 w-full h-0.5 flex items-center px-4">
                        <div className="bg-[#389E95] h-full transition-all duration-500" style={{ width: '33.3%' }}></div>
                        <div className="grow h-0 border-t-2 border-dashed border-white opacity-80 ml-1"></div>
                    </div>

                    {steps.map((label, i) => {
                        const isCurrent = i === currentStepIndex;
                        const isCompleted = i < currentStepIndex;
                        const isFuture = i > currentStepIndex;

                        return (
                            <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                                {isCurrent && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                                        <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
                                    </div>
                                )}
                                <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 shadow-sm
                                    ${(isCompleted || isCurrent) ? "bg-[#389E95] border-[#389E95] scale-110" : ""}
                                    ${isFuture ? "bg-white border-[#389E95]" : ""}
                                `}></div>
                                <span className={`text-[10px] font-black text-[#389E95] transition-colors duration-500`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ✨ 2. 影付き逆カーブ */}
            <div className="w-full h-14 relative z-10 -mt-1 overflow-visible">
                <svg 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none" 
                    className="w-full h-full filter drop-shadow-[0_8px_8px_rgba(0,0,0,0.06)]"
                    style={{ overflow: 'visible' }}
                >
                    <path 
                        d="M-10,0 L110,0 L110,0 Q50,100 -10,0 Z" 
                        fill="#D6F8C2" 
                    />
                </svg>
            </div>

            {/* ⚪️ 3. ホワイトコンテンツエリア */}
            <div className="w-full grow px-8 pb-44 relative z-0 pt-10">
                <div className="w-full max-w-100.5 mx-auto">{renderContent()}</div>
            </div>

            {/* 🔘 ナビゲーション */}
            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/10">
                <button
                    onClick={() => {
                        if (step === "result") setStep("area");
                        else if (step === "area") setStep("pref");
                        else if (step === "pref") setStep("region");
                        else router.push(`/groups/${passcode}`);
                    }}
                    className="flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                >
                    <span className="text-[#389E95] font-black text-base">戻る</span>
                </button>
                <Link
                    href={step === "result" ? `/groups/${passcode}/purpose` : "#"}
                    className={`flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center transition-all ${step !== "result" || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
                >
                    <span className="text-[#389E95] font-black text-base">次へ</span>
                </Link>
            </div>
        </div>
    );
}

export default function GroupAreaPage() {
    const params = useParams<{ id: string }>();

    return (
        <main className="min-h-screen bg-white flex flex-col relative items-center overflow-x-hidden">
            {/* 🐧 修正：一番上のロゴエリアを白（bg-white）にして、スッキリさせました */}
            <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />
            
            <header className="relative z-30 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
                <Link href="/groups">
                    <Image src="/homelogo.svg" alt="home" width={32} height={32} />
                </Link>
                <div className="ml-auto">
                    <TeamMembersHeader passcode={params.id} />
                </div>
            </header>

            <Suspense fallback={<div className="pt-20 text-[#389E95] font-black text-center">地図を広げています...</div>}>
                <AreaSelectionContent passcode={params.id} />
            </Suspense>
        </main>
    );
}