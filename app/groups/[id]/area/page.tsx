"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
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

    const steps = ["ホーム", "場所", "目的", "条件"];
    const currentStepIndex = 1; 

    // ✅ 選択可能なエリアを制限
    const allowedAreas = ["渋谷・原宿・表参道", "新宿・代々木"];

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
                    <div className="w-full">
                        <p className="text-[#BABABA] text-sm font-bold mb-6 text-center tracking-widest uppercase">地方を選択</p>
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
                                            {!isTarget && <span className="text-[9px] bg-white/80 text-gray-400 px-2 py-0.5 rounded border border-gray-100 font-bold">Coming Soon</span>}
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
                    <div className="w-full">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-bold tracking-widest uppercase">{selectedRegion}</p>
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
                                        {!isTarget && <span className="text-[8px] text-gray-400 font-bold opacity-70">Coming Soon</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case "area":
                return (
                    <div className="w-full">
                        <div className="flex justify-center items-center mb-6">
                            <p className="text-[#BABABA] text-sm font-bold tracking-widest uppercase">{selectedPref}</p>
                        </div>
                        <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                            {areaData[selectedRegion][selectedPref].map((area) => {
                                // 渋谷・原宿・表参道 と 新宿・代々木 だけを有効にする
                                const isEnabled = allowedAreas.includes(area);
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
                                                : "text-[#BABABA]/40 bg-gray-50/30 cursor-not-allowed border-none opacity-50"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${isEnabled ? "border-[#389E95]/30" : "border-gray-200"}`}>
                                                {isEnabled && <div className="w-2 h-2 rounded-full bg-[#389E95]"></div>}
                                            </span>
                                            {area}
                                        </div>
                                        {!isEnabled && <span className="text-[10px] bg-gray-200 text-gray-400 px-2 py-0.5 rounded font-bold tracking-tighter">Coming Soon</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
          case "result":
                return (
                    <div className="w-full flex flex-col items-center justify-center pt-8 pb-16">
                        
                        {/* 🟠 ✅ 四隅の穴を削除し、アニメーションを「じわっと」した動きに強化 */}
                        {/* slide-in-from-top-80 でより高い位置から、duration-1200 でゆっくり降ろします */}
                        <div className="w-full max-w-[320px] aspect-square bg-white border-8 border-[#389E95] rounded-[45px] flex flex-col items-center justify-center gap-6 shadow-2xl text-center relative overflow-hidden
                            animate-in fade-in slide-in-from-top-80 duration-[1200ms] ease-out">
                            
                            {/* ピンアイコン */}
                            <span className="text-7xl mb-1 drop-shadow-sm">📍</span>
                            
                            <div className="flex flex-col gap-2 px-4">
                                {/* 都道府県 */}
                                <span className="text-[#BABABA] text-sm font-bold tracking-[0.2em] uppercase">
                                    {selectedPref}
                                </span>
                                {/* エリア名 */}
                                <span className="text-[#2D7D76] text-3xl font-black tracking-wider leading-tight drop-shadow-sm">
                                    {selectedArea}
                                </span>
                            </div>

                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-full flex flex-col items-center select-none relative bg-[#D6F8C2]">
            
            <div className="w-full bg-[#D6F8C2] pt-10 pb-10 px-10 flex flex-col items-center relative z-20">
                <div className="w-full max-w-80 flex justify-between items-start relative shrink-0 min-h-12.5">
                    <div className="absolute top-1.75 left-0 w-full h-0.5 flex items-center px-4">
                        <div className="bg-[#389E95] h-full transition-all duration-500" style={{ width: '33.3%' }}></div>
                        <div className="grow h-0 border-t-2 border-dashed border-white opacity-80 ml-1"></div>
                    </div>

                    {steps.map((label, i) => (
                        <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                            {i === currentStepIndex && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                                    <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
                                </div>
                            )}
                            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 shadow-sm
                                ${i <= currentStepIndex ? "bg-[#389E95] border-[#389E95] scale-110" : "bg-white border-[#389E95]"}
                            `}></div>
                            <span className="text-[10px] font-bold text-[#389E95]">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🐾 メインコンテンツエリア */}
            <div className="w-full grow px-6 pb-44 relative z-10">
                {step === "result" ? (
                    // ✅ 確認画面：白カードをなくして中央に配置（ここは renderContent で制御するように戻しました）
                    renderContent()
                ) : (
                    // 選択中：白いカードを表示
                    <div className="w-full max-w-100.5 mx-auto bg-white rounded-[40px] p-8 shadow-xl min-h-100">
                        {renderContent()}
                    </div>
                )}
            </div>

            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/10">
                <button
                    onClick={() => {
                        if (step === "result") setStep("area");
                        else if (step === "area") setStep("pref");
                        else if (step === "pref") setStep("region");
                        else router.back(); 
                    }}
                    className="flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center active:scale-95 transition-all shadow-sm text-[#389E95] font-bold text-base"
                >
                    戻る
                </button>
                <Link
                    href={step === "result" ? `/groups/${passcode}/purpose` : "#"}
                    className={`flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center transition-all text-[#389E95] font-bold text-base ${step !== "result" || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
                >
                    次へ
                </Link>
            </div>
        </div>
    );
}

export default function GroupAreaPage() {
    const params = useParams<{ id: string }>();

    return (
        <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-x-hidden select-none">
            <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />
            
            <HomeHeaderBar
                href="/groups"
                className="z-30 shadow-sm"
                rightSlot={
                    <div className="ml-auto">
                        <TeamMembersHeader passcode={params.id} />
                    </div>
                }
            />
            <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">地図を広げています...</div>}>
                <AreaSelectionContent passcode={params.id} />
            </Suspense>
        </main>
    );
}