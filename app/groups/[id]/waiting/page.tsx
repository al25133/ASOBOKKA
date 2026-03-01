"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberRow = {
	user_id: string;
	is_ready: boolean;
};

export default function GroupWaitingPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const passcode = params.id;
	const [loading, setLoading] = useState(true);
	const [groupId, setGroupId] = useState<string | null>(null);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [message, setMessage] = useState<string | null>(null);

	const fetchMembers = useCallback(async (targetGroupId: string) => {
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

		const result = (await response.json()) as { members?: MemberRow[] };
		setMembers(result.members ?? []);
	}, []);

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

			if (joinResult.error || !joinResult.data) {
				setMessage("グループが見つかりませんでした。");
				setLoading(false);
				return;
			}

			setGroupId(joinResult.data);
			await fetchMembers(joinResult.data);
			setLoading(false);
		};

		void initialize();
	}, [fetchMembers, passcode, router]);

	useEffect(() => {
		if (!groupId) {
			return;
		}

		const supabase = getSupabaseClient();
		const channel = supabase
			.channel(`group-members-${groupId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "group_members",
					filter: `group_id=eq.${groupId}`,
				},
				() => {
					void fetchMembers(groupId);
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [fetchMembers, groupId]);

	const allReady = useMemo(() => members.length > 0 && members.every((member) => member.is_ready), [members]);

	useEffect(() => {
		if (!loading && allReady) {
			router.replace(`/groups/${passcode}/waiting/complete`);
		}
	}, [allReady, loading, passcode, router]);

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-x-hidden">
			<TopLogoBar className="bg-[#D6F8C2]" />
			<header className="relative z-30 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
				<Link href="/groups">
					<Image src="/homelogo.svg" alt="home" width={32} height={32} />
				</Link>
				<div className="ml-auto">
					<TeamMembersHeader passcode={passcode} />
				</div>
			</header>

			<section className="w-full flex-1 flex flex-col items-center justify-center px-6 pb-20">
				<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
				<Image src="/待機中.svg" alt="待機中" width={180} height={180} className="mt-4 object-contain" />
				<p className="mt-4 text-base font-bold text-[#5A7C55]">待機しています</p>
				{message ? <p className="mt-3 text-sm text-[#5A5A5A]">{message}</p> : null}
			</section>
		</main>
	);
}