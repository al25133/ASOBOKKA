// 仮デザイン: 本画面は一時的な暫定UIです（後続で正式デザインへ置き換え予定）。
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountMenu } from "@/components/ui/account-menu";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const areaOptions = ["渋谷", "新宿", "池袋", "上野", "横浜"];
const purposeOptions = ["ごはん", "カフェ", "観光", "ショッピング", "アクティビティ"];
const valueOptions = ["コスパ重視", "雰囲気重視", "アクセス重視", "新規性重視", "ゆったり重視"];

type MemberRow = {
	user_id: string;
	nickname: string;
	avatar: string;
	selected_area: string | null;
	selected_purpose: string | null;
	selected_value: string | null;
	is_ready: boolean;
};

function OptionGroup({
	title,
	options,
	value,
	onSelect,
}: {
	title: string;
	options: string[];
	value: string;
	onSelect: (next: string) => void;
}) {
	return (
		<section className="space-y-2">
			<h2 className="text-sm font-bold text-[#5A7C55]">{title}</h2>
			<div className="grid grid-cols-2 gap-2">
				{options.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onSelect(option)}
						className={cn(
							"rounded-2xl border px-3 py-2 text-left text-sm transition",
							value === option
								? "border-[#52A399] bg-[#52A399] text-white"
								: "border-gray-200 bg-[#F9FBF9] text-[#5A5A5A] hover:bg-[#EEF7EB]",
						)}
					>
						{option}
					</button>
				))}
			</div>
		</section>
	);
}

export default function GroupRoom() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const [avatarId, setAvatarId] = useState("1");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [groupId, setGroupId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [area, setArea] = useState("");
	const [purpose, setPurpose] = useState("");
	const [value, setValue] = useState("");
	const redirectedToResultRef = useRef(false);
	const passcode = params.id;

	const fetchMembers = useCallback(
		async (targetGroupId: string) => {
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
		},
		[],
	);

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

			const avatar = authData.user.user_metadata?.avatar;
			if (typeof avatar === "number" || typeof avatar === "string") {
				setAvatarId(String(avatar));
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
		if (allReady && !redirectedToResultRef.current) {
			redirectedToResultRef.current = true;
			router.push(`/groups/${passcode}/result`);
		}
	}, [allReady, passcode, router]);

	const saveSelection = async (ready: boolean) => {
		const supabase = getSupabaseClient();
		if (!groupId || !userId) {
			return;
		}
		if (!area || !purpose || !value) {
			setMessage("エリア・目的・価値観をすべて選択してください。");
			return;
		}

		setSaving(true);
		setMessage(null);
		const { error } = await supabase.from("group_members").upsert(
			{
				group_id: groupId,
				user_id: userId,
				selected_area: area,
				selected_purpose: purpose,
				selected_value: value,
				is_ready: ready,
			},
			{ onConflict: "group_id,user_id" },
		);
		setSaving(false);

		if (error) {
			setMessage(error.message);
			return;
		}

		await fetchMembers(groupId);
		setMessage(ready ? "待機完了にしました。全員完了で結果画面へ遷移します。" : "選択内容を保存しました。");
	};

	if (loading) {
		return <main className="min-h-screen bg-[#D6F8C2]" />;
	}

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
			<div className="relative z-20 flex justify-center py-4 w-full">
				<Link href="/" className="active:scale-95 transition-transform">
					<Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
				</Link>
			</div>

			<header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
				<Link href="/" className="active:scale-90 transition-transform">
					<Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
				</Link>
				<AccountMenu avatarId={avatarId} />
			</header>

			<div className="relative z-10 w-full max-w-112.5 px-6 pt-8 pb-12 space-y-6">
				<section className="bg-white rounded-[30px] border-2 border-[#389E95]/40 p-5 shadow-sm">
					<p className="text-[#389E95] text-xs font-bold mb-1">グループ番号</p>
					<p className="text-[#5A5A5A] text-4xl font-bold tracking-widest">{passcode}</p>
					<p className="text-[#389E95] text-xs mt-2">選択内容はリアルタイムで同期されます。</p>
				</section>

				<div className="grid gap-6 md:grid-cols-[1fr_320px]">
					<section className="space-y-5 bg-white rounded-[30px] p-5 border border-[#389E95]/20 shadow-sm">
						<OptionGroup title="エリア" options={areaOptions} value={area} onSelect={setArea} />
						<OptionGroup title="目的" options={purposeOptions} value={purpose} onSelect={setPurpose} />
						<OptionGroup title="価値観" options={valueOptions} value={value} onSelect={setValue} />

						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2">
							<button
								type="button"
								disabled={saving}
								onClick={() => void saveSelection(false)}
								className="w-full bg-white border-2 border-[#52A399]/40 text-[#389E95] font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-70"
							>
								選択を保存
							</button>
							<button
								type="button"
								disabled={saving}
								onClick={() => void saveSelection(true)}
								className="w-full bg-[#52A399] text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-70"
							>
								待機完了
							</button>
						</div>
						{message ? <p className="text-sm text-[#5A5A5A]">{message}</p> : null}
					</section>

					<aside className="bg-white rounded-[30px] p-5 border border-[#389E95]/20 shadow-sm">
						<h2 className="mb-3 text-sm font-bold text-[#5A7C55]">メンバー状況</h2>
						<ul className="space-y-2">
							{members.map((member) => (
								<li key={member.user_id} className="rounded-2xl border border-[#389E95]/20 p-3 text-sm bg-[#F9FBF9]">
									<div className="mb-2 flex items-center gap-2">
										<div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#D6F8C2] bg-white">
											<Image src={`/avatars/avatar${member.avatar}.svg`} alt="メンバーアイコン" fill className="object-contain" />
										</div>
										<p className="font-semibold text-[#5A5A5A]">{member.user_id === userId ? "あなた" : member.nickname}</p>
									</div>
									<p className="text-[#6D8D69]">エリア: {member.selected_area ?? "未選択"}</p>
									<p className="text-[#6D8D69]">目的: {member.selected_purpose ?? "未選択"}</p>
									<p className="text-[#6D8D69]">価値観: {member.selected_value ?? "未選択"}</p>
									<p className={member.is_ready ? "text-emerald-600" : "text-[#6D8D69]"}>{member.is_ready ? "待機完了" : "入力中"}</p>
								</li>
							))}
						</ul>
					</aside>
				</div>
			</div>
		</main>
	);
}
