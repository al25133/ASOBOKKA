"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const areaOptions = ["渋谷", "新宿", "池袋", "上野", "横浜"];
const purposeOptions = ["ごはん", "カフェ", "観光", "ショッピング", "アクティビティ"];
const valueOptions = ["コスパ重視", "雰囲気重視", "アクセス重視", "新規性重視", "ゆったり重視"];

type MemberRow = {
	user_id: string;
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
			<h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
			<div className="grid grid-cols-2 gap-2">
				{options.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onSelect(option)}
						className={cn(
							"rounded-xl border px-3 py-2 text-left text-sm transition",
							value === option
								? "border-foreground bg-foreground text-background"
								: "border-zinc-300 hover:bg-zinc-50",
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
			const { data, error } = await supabase
				.from("group_members")
				.select("user_id, selected_area, selected_purpose, selected_value, is_ready")
				.eq("group_id", targetGroupId)
				.order("created_at", { ascending: true });

			if (error) {
				setMessage(error.message);
				return;
			}

			setMembers(data ?? []);
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
		return <main className="mx-auto min-h-screen w-full max-w-3xl p-6">読み込み中...</main>;
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl p-6">
			<Header title={`グループ ${passcode}`} description="選択内容はリアルタイムで同期されます。" />

			<div className="grid gap-6 md:grid-cols-[1fr_320px]">
				<section className="space-y-5 rounded-2xl border border-zinc-200 p-5">
					<OptionGroup title="エリア" options={areaOptions} value={area} onSelect={setArea} />
					<OptionGroup title="目的" options={purposeOptions} value={purpose} onSelect={setPurpose} />
					<OptionGroup title="価値観" options={valueOptions} value={value} onSelect={setValue} />

					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<Button variant="secondary" disabled={saving} onClick={() => void saveSelection(false)}>
							選択を保存
						</Button>
						<Button disabled={saving} onClick={() => void saveSelection(true)}>
							待機完了
						</Button>
					</div>
					{message ? <p className="text-sm text-zinc-700">{message}</p> : null}
				</section>

				<aside className="rounded-2xl border border-zinc-200 p-5">
					<h2 className="mb-3 text-sm font-semibold text-zinc-700">メンバー状況</h2>
					<ul className="space-y-2">
						{members.map((member) => (
							<li key={member.user_id} className="rounded-xl border border-zinc-200 p-3 text-sm">
								<p className="font-medium">
									{member.user_id === userId ? "あなた" : `メンバー ${member.user_id.slice(0, 8)}`}
								</p>
								<p className="text-zinc-600">エリア: {member.selected_area ?? "未選択"}</p>
								<p className="text-zinc-600">目的: {member.selected_purpose ?? "未選択"}</p>
								<p className="text-zinc-600">価値観: {member.selected_value ?? "未選択"}</p>
								<p className={member.is_ready ? "text-emerald-600" : "text-zinc-500"}>
									{member.is_ready ? "待機完了" : "入力中"}
								</p>
							</li>
						))}
					</ul>
				</aside>
			</div>
		</main>
	);
}
