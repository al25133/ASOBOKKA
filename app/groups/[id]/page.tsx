"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
// 🐧 HomeHeaderBar は使わず、TopLogoBar のみインポート
import { TopLogoBar } from "@/components/ui/app-header";
import { BottomCurveBackground } from "@/components/ui/decorative-layout";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type GroupMember = {
    user_id: string;
    nickname: string;
    avatar: string;
};

export default function GroupRoomPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const passcode = params.id;

    const [authChecked, setAuthChecked] = useState(false);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    const fetchMembers = async (targetGroupId: string) => {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
            setMessage("セッションが確認できませんでした。再ログインしてください。");
            return;
        }

        const response = await fetch("/api/groups/members", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ groupId: targetGroupId }),
        });

        if (!response.ok) {
            const result = (await response.json().catch(() => null)) as { message?: string } | null;
            setMessage(result?.message ?? "メンバー情報の取得に失敗しました。");
            return;
        }

        const result = (await response.json()) as { members?: GroupMember[] };
        setMembers(result.members ?? []);
    };

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

            setUserId(authData.user.id);

            if (joinResult.error || !joinResult.data) {
                setMessage("グループが見つかりませんでした。");
                setAuthChecked(true);
                return;
            }

            setGroupId(joinResult.data);
            await fetchMembers(joinResult.data);
            setAuthChecked(true);
        };

        void initialize();
    }, [passcode, router]);

    useEffect(() => {
        if (!groupId) return;

        const supabase = getSupabaseClient();
        const channel = supabase
            .channel(`group-room-members-${groupId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
                () => { void fetchMembers(groupId); }
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    }, [groupId]);

    if (!authChecked) {
        return <main className="min-h-screen bg-[#D6F8C2]" />;
    }

    return (
        <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
            
            {/* ✨ 1. ロゴエリア：背景を薄い緑 (#D6F8C2) にして三本線を消す */}
            <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />

            {/* ✨ 2. 自作ヘッダーバー：三本線を確実に排除し、アバターを右寄せ */}
            <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
                <Link href="/groups">
                    <Image src="/homelogo.svg" alt="home" width={32} height={32} />
                </Link>
                <div className="ml-auto">
                    <TeamMembersHeader members={members} />
                </div>
            </header>

            <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-10 px-6 pb-40">
                <div className="relative w-full mb-24">
                    <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] p-6 pt-5 relative z-10 shadow-sm">
                        <p className="text-[#389E95] text-[10px] font-black mb-1">グループの番号は</p>
                        <p className="text-[#5A5A5A] text-center text-5xl font-black tracking-widest my-3">{passcode}</p>
                        <p className="text-[#389E95] text-[10px] font-black text-right">みんなに教えてね！</p>
                        <div className="absolute top-[77%] -right-3 w-5 h-5 bg-white border-t-[3px] border-r-[3px] border-[#389E95] rotate-45 -translate-y-1/2"></div>
                    </div>

                    <div className="absolute -right-4 -bottom-28 w-36 h-36 z-20">
                        <Image src="/大きいペンギン白 1.svg" alt="ペンギン" width={144} height={144} className="object-contain" />
                    </div>
                </div>

                <div className="w-full mt-4">
                    <p className="text-[#389E95] text-sm font-black mb-2 ml-2">メンバー</p>
                    <div className="bg-white rounded-[30px] p-8 min-h-70 shadow-sm border border-[#389E95]/10">
                        {message ? <p className="mb-3 text-sm text-red-600">{message}</p> : null}
                        <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                            {members.map((member) => (
                                <div key={member.user_id} className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 rounded-full border-2 border-[#D6F8C2] overflow-hidden bg-white shadow-sm">
                                        <Image src={`/avatars/avatar${member.avatar}.svg`} alt="メンバー" width={56} height={56} />
                                    </div>
                                    <span className="text-[10px] text-[#5A5A5A] font-black">{member.user_id === userId ? "あなた" : member.nickname}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3 mx-auto">
                <Link href="/" className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center active:scale-95 transition-all">
                    <span className="text-[#389E95] font-black">戻る</span>
                </Link>
                <Link href={`/groups/${passcode}/area`} className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center active:scale-95 transition-all">
                    <span className="text-[#389E95] font-black">診断スタート</span>
                </Link>
            </div>

            <BottomCurveBackground className="h-44 rounded-t-[140px]" />
        </main>
    );
}
