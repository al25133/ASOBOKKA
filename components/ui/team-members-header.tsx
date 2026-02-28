"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
// 🐧 HeaderHamburger のインポートを削除しました
import { getSupabaseClient } from "@/lib/supabase/client";

type TeamMember = {
    user_id: string;
    avatar: string;
};

type TeamMembersHeaderProps = {
    passcode?: string;
    members?: TeamMember[];
};

export function TeamMembersHeader({ passcode, members }: TeamMembersHeaderProps) {
    const [fetchedMembers, setFetchedMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        if (members || !passcode) {
            return;
        }

        const loadMembers = async () => {
            const supabase = getSupabaseClient();
            const [{ data: sessionData }, groupResult] = await Promise.all([
                supabase.auth.getSession(),
                supabase.rpc("find_group_by_passcode", { input_passcode: passcode }),
            ]);

            const accessToken = sessionData.session?.access_token;
            const groupId = groupResult.data?.[0]?.group_id;

            if (!accessToken || !groupId) {
                return;
            }

            const response = await fetch("/api/groups/members", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ groupId }),
            });

            if (!response.ok) {
                return;
            }

            const result = (await response.json()) as { members?: TeamMember[] };
            setFetchedMembers(result.members ?? []);
        };

        void loadMembers();
    }, [members, passcode]);

    const visibleMembers = useMemo(() => {
        const source = members ?? fetchedMembers;
        return source.slice(0, 3);
    }, [fetchedMembers, members]);

    return (
        <div className="flex items-center">
            {/* アバターを表示するエリア */}
            <div className="flex -space-x-3">
                {visibleMembers.length > 0
                    ? visibleMembers.map((member) => (
                            <div key={member.user_id} className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-md">
                                <Image src={`/avatars/avatar${member.avatar}.svg`} alt="member" width={36} height={36} />
                            </div>
                        ))
                    : [1].map((id) => (
                            <div key={id} className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-md">
                                <Image src={`/avatars/avatar${id}.svg`} alt="member" width={36} height={36} />
                            </div>
                        ))}
            </div>
            {/* ✨ 三本線ボタン（HeaderHamburger）をここから削除しました！ */}
        </div>
    );
}