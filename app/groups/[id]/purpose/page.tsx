"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

const purposeOptions = [
    { id: 1, title: "ショッピング", sub: "宝探ししたい", fileName: "shopping.svg" },
    { id: 2, title: "自然", sub: "疲れた心を癒したい", fileName: "nature.svg" },
    { id: 3, title: "カフェ", sub: "ゆっくり語りたい", fileName: "cafe.svg" },
    { id: 4, title: "ミュージアム", sub: "静かに刺激を受けたい", fileName: "museum.svg" },
    { id: 5, title: "観光", sub: "ちょっと冒険したい", fileName: "sightseeing.svg" },
    { id: 6, title: "食事", sub: "がっつり満たされたい", fileName: "meal.svg" },
    { id: 7, title: "エンタメ・文化", sub: "自由に楽しみたい", fileName: "entartainment.svg" },
    { id: 8, title: "アウトドア", sub: "体を動かしたい", fileName: "outdoor.svg" },
];

function PurposeSelectionContent({ passcode }: { passcode: string }) {
    const router = useRouter();
    const [selectedPurposeId, setSelectedPurposeId] = useState<number | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState("");
    const [groupId, setGroupId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [saving, setSaving] = useState(false);

    const steps = ["ホーム", "場所", "目的", "条件"];
    const currentStepIndex = 2; 

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
                    .select("selected_purpose")
                    .eq("group_id", joinResult.data)
                    .eq("user_id", authData.user.id)
                    .maybeSingle();

                if (memberData?.selected_purpose) {
                    setSelectedPurpose(memberData.selected_purpose);
                    const matched = purposeOptions.find((p) => p.title === memberData.selected_purpose);
                    if (matched) setSelectedPurposeId(matched.id);
                }
            }
            setInitializing(false);
        };
        void initialize();
    }, [passcode, router]);

    const savePurpose = async (nextPurpose: string) => {
        if (!groupId || !userId) return;
        setSaving(true);
        const supabase = getSupabaseClient();
        await supabase.from("group_members").upsert(
            { group_id: groupId, user_id: userId, selected_purpose: nextPurpose, is_ready: false },
            { onConflict: "group_id,user_id" },
        );
        setSaving(false);
    };

    if (initializing) return <div className="pt-20 text-[#389E95] font-bold text-center">準備中...</div>;

    return (
        <div className="w-full flex flex-col items-center select-none relative bg-[#D6F8C2]">
            
            <div className="w-full bg-[#D6F8C2] pt-10 pb-6 px-10 flex flex-col items-center relative z-20">
                <div className="w-full max-w-80 flex justify-between items-start relative shrink-0 min-h-12.5">
                    <div className="absolute top-1.75 left-0 w-full h-0.5 flex items-center px-4">
                        <div className="bg-[#389E95] h-full transition-all duration-500" style={{ width: '66.6%' }}></div>
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
                                <span className="text-[10px] font-bold text-[#389E95] transition-colors duration-500">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full grow px-6 pb-44 relative z-10">
                <div className="w-full max-w-100.5 mx-auto grid grid-cols-2 gap-3 pb-2">
                    {purposeOptions.map((p) => {
                        const isSelected = selectedPurposeId === p.id;
                        return (
                            <div
                                key={p.id}
                                onClick={() => {
                                    setSelectedPurposeId(p.id);
                                    setSelectedPurpose(p.title);
                                    void savePurpose(p.title);
                                }}
                                className="relative h-36 rounded-[25px] overflow-hidden shadow-xl active:scale-95 bg-white transition-transform cursor-pointer border-2 border-white/20"
                            >
                                <div className="absolute inset-0">
                                    <Image src={`/purpose/${p.fileName}`} alt={p.title} fill className="object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent"></div>
                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                    <p className="text-sm font-bold leading-tight">{p.title}</p>
                                    <p className="text-[8px] font-medium opacity-90 tracking-tighter">{p.sub}</p>
                                </div>

                                {/* ❤️ ハートの枠（未選択）と赤いハート（選択済み） */}
                                <div className={`absolute top-2.5 right-2.5 transition-all duration-300 ${isSelected ? "text-[#FF5A5F] scale-110" : "text-white/80"}`}>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        viewBox="0 0 24 24" 
                                        strokeWidth="2.5" 
                                        stroke="currentColor" 
                                        fill={isSelected ? "currentColor" : "none"} 
                                        className="w-6 h-6 drop-shadow-md"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" 
                                        />
                                    </svg>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/10">
                <Link href={`/groups/${passcode}/area`} className="flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center active:scale-95 transition-all shadow-sm text-[#389E95] font-bold text-base">
                    戻る
                </Link>
                <Link
                    href={selectedPurpose ? `/groups/${passcode}/condition` : "#"}
                    className={`flex-1 bg-white rounded-2xl py-3.5 flex items-center justify-center transition-all text-[#389E95] font-bold text-base ${!selectedPurpose || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
                >
                    次へ
                </Link>
            </div>
        </div>
    );
}

export default function GroupPurposePage() {
    const params = useParams<{ id: string }>();

    return (
        <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-x-hidden">
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
                <PurposeSelectionContent passcode={params.id} />
            </Suspense>
        </main>
    );
}