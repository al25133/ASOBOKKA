"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { areaData } from "@/datas/area";


const ENABLED_AREAS = ["渋谷・原宿・表参道", "新宿・代々木"];

function AreaSelectionContent({ passcode }: { passcode: string }) {
    const router = useRouter();
    const [step, setStep] = useState<"region" | "pref" | "area" | "result">("region");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedPref, setSelectedPref] = useState("");
    const [selectedArea, setSelectedArea] = useState("");
    const [groupId, setGroupId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [saving, setSaving] = useState(false);

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
            setInitializing(false);
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
                    <div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
                        <p className="text-[#BABABA] text-sm font-black mb-6 text-center tracking-widest">地方を選択</p>
                        <div className="grid grid-cols-1 gap-3">
                            {Object.keys(areaData).map((region) => {
                                const isTarget = region === "関東";
                                return (
                                    <button
                                        key={region}
                                        onClick={() => { setSelectedRegion(region); setStep("pref"); }}
                                        className={`w-full text-left text-lg font-bold py-5 px-6 rounded-2xl flex justify-between items-center transition-all shadow-sm
                                            ${isTarget 
                                                ? "text-[#5A5A5A] bg-[#D6F8C2]/20 active:scale-95" 
                                                : "text-[#BABABA]/60 bg-gray-50/50 opacity-70" // 色を薄く
                                            }`}
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
                    <div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-black tracking-widest">{selectedRegion}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-100 overflow-y-auto pr-1">
                            {Object.keys(areaData[selectedRegion]).map((pref) => {
                                const isTarget = pref === "東京";
                                return (
                                    <button
                                        key={pref}
                                        onClick={() => { setSelectedPref(pref); setStep("area"); }}
                                        className={`text-lg font-bold py-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1
                                            ${isTarget 
                                                ? "text-[#5A5A5A] border-[#389E95]/10 bg-white shadow-sm active:bg-[#D6F8C2]" 
                                                : "text-[#BABABA]/60 border-transparent bg-gray-50/50 opacity-70" // 色を薄く
                                            }`}
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
                    <div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-black tracking-widest">{selectedPref}</p>
                        </div>
                        <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                            {areaData[selectedRegion][selectedPref].map((area) => {
                                const isEnabled = ENABLED_AREAS.includes(area);
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
                                                : "text-[#BABABA]/40 bg-gray-50/30 cursor-not-allowed border-none opacity-60" // 色を薄く
                                            }`}
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
                    <div className="w-full grow flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-500 pb-20 px-4">
                        <div className="w-full bg-white border-[6px] border-[#389E95] rounded-[45px] p-10 flex flex-col items-center gap-5 shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#D6F8C2]"></div>
                            <span className="text-6xl mb-2 drop-shadow-sm">📍</span>
                            <div className="flex flex-col gap-2">
                                <span className="text-[#BABABA] text-base font-bold tracking-widest">{selectedPref}</span>
                                <span className="text-[#389E95] text-3xl font-black tracking-wider leading-tight">{selectedArea}</span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-12 px-8 min-h-[calc(100vh-100px)] select-none">
            {/* 🧭 プログレスバー */}
            <div className="w-full flex justify-between items-center mb-8 px-2 relative shrink-0">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white z-0 -translate-y-1/2 opacity-50"></div>
                {["ホーム", "場所", "目的", "条件"].map((label, i) => (
                    <div key={label} className="relative z-10 flex flex-col items-center gap-1">
                        {i === 1 && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                                <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
                            </div>
                        )}
                        <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 1 ? "bg-[#389E95] border-[#389E95] scale-110 shadow-md" : "bg-white border-[#389E95]/30"}`}></div>
                        <span className={`text-[10px] font-black ${i <= 1 ? "text-[#389E95]" : "text-[#389E95]/40"}`}>{label}</span>
                    </div>
                ))}
            </div>

            <div className="w-full grow flex flex-col relative z-20">{renderContent()}</div>

            {/* ナビゲーション */}
            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/20">
                <button
                    onClick={() => {
                        if (step === "result") setStep("area");
                        else if (step === "area") setStep("pref");
                        else if (step === "pref") setStep("region");
                        else router.push(`/groups/${passcode}`);
                    }}
                    className="flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                >
                    <span className="text-[#389E95] font-black tracking-widest text-base">戻る</span>
                </button>
                <Link
                    href={step === "result" ? `/groups/${passcode}/purpose` : "#"}
                    className={`flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center transition-all ${step !== "result" || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
                >
                    <span className="text-[#389E95] font-black tracking-widest text-base">次へ</span>
                </Link>
            </div>
            <div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
        </div>
    );
}

export default function GroupAreaPage() {
    const params = useParams<{ id: string }>();
    return (
        <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden">
            <TopLogoBar className="bg-[#D6F8C2]" />
            <HomeHeaderBar rightSlot={<TeamMembersHeader passcode={params.id} />} />
            <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold">地図を広げています...</div>}>
                <AreaSelectionContent passcode={params.id} />
            </Suspense>
        </main>
    );
}