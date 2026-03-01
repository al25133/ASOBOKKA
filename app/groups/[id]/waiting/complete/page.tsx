"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberRow = {
	user_id: string;
	is_ready: boolean;
};

export default function GroupWaitingCompletePage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const passcode = params.id;
	const [loading, setLoading] = useState(true);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [message, setMessage] = useState<string | null>(null);

	const fetchMembers = useCallback(async () => {
		const supabase = getSupabaseClient();
		const [{ data: sessionData }, groupResult] = await Promise.all([
			supabase.auth.getSession(),
			supabase.rpc("find_group_by_passcode", { input_passcode: passcode }),
		]);
		const accessToken = sessionData.session?.access_token;
		const groupId = groupResult.data?.[0]?.group_id as string | undefined;

		if (!accessToken || !groupId) {
			setMessage("待機状態の確認に失敗しました。");
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
			const result = (await response.json().catch(() => null)) as { message?: string } | null;
			setMessage(result?.message ?? "待機状態の確認に失敗しました。");
			return;
		}

		const result = (await response.json()) as { members?: MemberRow[] };
		setMembers(result.members ?? []);
	}, [passcode]);

	useEffect(() => {
		const initialize = async () => {
			const supabase = getSupabaseClient();
			const { data: authData } = await supabase.auth.getUser();
			if (!authData.user) {
				router.replace("/login");
				return;
			}

			await fetchMembers();
			setLoading(false);
		};

		void initialize();
	}, [fetchMembers, router]);

	const allReady = useMemo(() => members.length > 0 && members.every((member) => member.is_ready), [members]);

	useEffect(() => {
		if (!loading && !allReady) {
			router.replace(`/groups/${passcode}/waiting`);
		}
	}, [allReady, loading, passcode, router]);

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-x-hidden">
			<TopLogoBar className="bg-[#D6F8C2]" />
			<HomeHeaderBar
				href="/groups"
				className="z-30 shadow-sm"
				rightSlot={
					<div className="ml-auto">
						<TeamMembersHeader passcode={passcode} />
					</div>
				}
			/>

			<section className="w-full flex-1 flex flex-col items-center justify-center px-6 pb-20">
				<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
				<Image src="/待機完了.svg" alt="待機完了" width={180} height={180} className="mt-4 object-contain" />
				<p className="mt-3 text-base font-bold text-[#5A7C55]">お待たせしました！</p>
				<Link
					href={`/groups/${passcode}/result`}
					className="mt-4 w-full max-w-72 bg-[#52A399] text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-all text-center"
				>
					結果を見る
				</Link>
				{message ? <p className="mt-3 text-sm text-[#5A5A5A]">{message}</p> : null}
			</section>
		</main>
	);
}