"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, []);

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
		<div className="relative flex items-center" ref={containerRef}>
			<button
				type="button"
				onClick={() => setOpen((previous) => !previous)}
				className="rounded-full active:scale-95 transition-transform"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label="グループ情報を開く"
			>
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
			</button>

			{open ? (
				<div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-[#389E95]/20 bg-white shadow-xl overflow-hidden">
					<div className="px-4 py-3 border-b border-[#389E95]/10">
						<p className="text-xs text-[#5A7C55]">グループ番号</p>
						<p className="text-sm font-bold text-[#389E95]">{passcode ?? "未設定"}</p>
					</div>
					<nav className="py-1" aria-label="グループヘッダーメニュー">
						<Link
							href="/account/settings"
							onClick={() => setOpen(false)}
							className="block px-4 py-2.5 text-sm text-[#5A5A5A] hover:bg-[#F0FAED] transition-colors"
						>
							アカウント設定
						</Link>
					</nav>
				</div>
			) : null}
		</div>
	);
}
