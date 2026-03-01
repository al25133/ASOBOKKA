"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

type MemberState = {
	user_id: string;
	is_ready: boolean;
};

function GroupWaitingContent({ passcode }: { passcode: string }) {
	const router = useRouter();
	const [groupId, setGroupId] = useState<string | null>(null);
	const [members, setMembers] = useState<MemberState[]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState<string | null>(null);

	const fetchMembers = useCallback(async (targetGroupId: string) => {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from("group_members")
			.select("user_id, is_ready")
			.eq("group_id", targetGroupId);

		if (error) {
			setMessage("メンバー状況の取得に失敗しました。");
			return;
		}

		setMembers(data ?? []);
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
			.channel(`group-members-waiting-${groupId}`)
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

	if (loading) {
		return <div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>;
	}

	return (
		<div className="relative z-10 w-full max-w-100.5 px-6 pt-10 pb-16">
			{message ? (
				<p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>
			) : null}
			{allReady ? (
				<div className="min-h-90 flex flex-col items-center justify-center pt-20">
					<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
					<Image src="/待機完了.svg" alt="待機完了" width={180} height={180} className="mt-4 object-contain" />
					<p className="mt-3 text-base font-bold text-[#5A7C55]">お待たせしました！</p>
					<button
						type="button"
						onClick={() => router.push(`/groups/${passcode}/result`)}
						className="mt-4 w-full max-w-72 bg-[#52A399] text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
					>
						結果を見る
					</button>
				</div>
			) : (
				<div className="min-h-90 flex flex-col items-center justify-center pt-20">
					<Image src="/足跡上.svg" alt="足跡" width={120} height={90} className="object-contain" />
					<Image src="/待機中.svg" alt="待機中" width={180} height={180} className="mt-4 object-contain" />
					<p className="mt-4 text-base font-bold text-[#5A7C55]">待機しています</p>
				</div>
			)}
		</div>
	);
}

function GroupWaitingPageContent() {
	const params = useParams<{ id: string }>();

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden select-none">
			<TopLogoBar className="bg-[#D6F8C2]" />
			<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={params.id} />} />
			<GroupWaitingContent passcode={params.id} />
		</main>
	);
}

export default function GroupWaitingPage() {
	return (
		<Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
			<GroupWaitingPageContent />
		</Suspense>
	);
}
