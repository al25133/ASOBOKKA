"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HeaderHamburger } from "@/components/ui/account-menu";
import { HomeHeaderBar, TopLogoBar } from "@/components/ui/app-header";
import { TeamMembersHeader } from "@/components/ui/team-members-header";
import { getSupabaseClient } from "@/lib/supabase/client";

const areaData: { [key: string]: { [pref: string]: string[] } } = {
	"北海道・東北": {
		北海道: ["札幌中心部", "小樽・千歳", "函館・道南", "旭川・富良野", "帯広・釧路", "稚内・網走"],
		青森: ["青森市", "弘前", "八戸", "五所川原", "むつ"],
		岩手: ["盛岡", "花巻", "北上", "一関", "釜石・宮古"],
		宮城: ["仙台市中心部", "泉中央", "長町", "石巻", "松島・塩釜"],
		秋田: ["秋田市", "横手", "大曲", "能代", "大館"],
		山形: ["山形市", "米沢", "酒田", "鶴岡", "天童"],
		福島: ["福島市", "郡山", "いわき", "会津若松", "白河"],
	},
	関東: {
		東京: ["渋谷・原宿・表参道", "新宿・代々木", "恵比寿・中目黒・代官山", "六本木・麻布・広尾", "銀座・有楽町", "上野・浅草", "池袋", "吉祥寺", "立川・町田", "豊洲・お台場"],
		神奈川: ["横浜中心部", "みなとみらい", "鎌倉・江の島", "川崎", "小田原・箱根", "厚木・海老名"],
		千葉: ["千葉市", "浦安・舞浜", "柏・松戸", "船橋・市川", "成田", "木更津"],
		埼玉: ["大宮・さいたま新都心", "浦和", "川越", "所沢", "越谷", "熊谷"],
		茨城: ["水戸", "つくば", "日立", "鹿嶋", "土浦"],
		栃木: ["宇都宮", "日光", "那須", "足利", "小山"],
		群馬: ["高崎", "前橋", "太田", "伊勢崎", "草津・伊香保"],
	},
	中部: {
		愛知: ["名古屋駅周辺", "栄・伏見", "金山", "豊田", "岡崎", "一宮"],
		静岡: ["静岡市", "浜松", "沼津・三島", "熱海・伊東", "富士", "藤枝"],
		新潟: ["新潟市", "長岡", "上越", "三条・燕", "佐渡"],
		石川: ["金沢", "加賀", "能登", "白山", "小松"],
		富山: ["富山市", "高岡", "魚津", "氷見", "砺波"],
		福井: ["福井市", "敦賀", "越前", "坂井", "小浜"],
		山梨: ["甲府", "富士吉田", "笛吹", "大月", "北杜"],
		長野: ["長野市", "松本", "上田", "軽井沢", "諏訪・茅野"],
		岐阜: ["岐阜市", "大垣", "各務原", "多治見", "高山・郡上"],
	},
	近畿: {
		大阪: ["梅田・北新地", "難波・心斎橋", "天王寺・阿倍野", "京橋", "新大阪", "吹田・豊中", "堺"],
		京都: ["京都市中心部", "祇園・河原町", "嵐山", "宇治", "亀岡", "福知山"],
		兵庫: ["神戸三宮・元町", "姫路", "尼崎", "西宮・芦屋", "宝塚", "明石"],
		滋賀: ["大津", "草津", "彦根", "長浜", "守山"],
		奈良: ["奈良市", "生駒", "橿原", "大和高田", "天理"],
		和歌山: ["和歌山市", "田辺", "新宮", "橋本", "白浜"],
		三重: ["津", "四日市", "伊勢", "松阪", "桑名"],
	},
	"中国・四国": {
		広島: ["広島市中心部", "福山", "呉", "東広島", "尾道・三原"],
		岡山: ["岡山市", "倉敷", "津山", "玉野", "高梁"],
		山口: ["下関", "山口市", "宇部", "周南", "岩国"],
		島根: ["松江", "出雲", "浜田", "益田", "安来"],
		鳥取: ["鳥取市", "米子", "倉吉", "境港", "岩美"],
		香川: ["高松", "丸亀", "坂出", "観音寺", "さぬき"],
		徳島: ["徳島市", "鳴門", "阿南", "吉野川", "美馬"],
		愛媛: ["松山市", "今治", "新居浜", "西条", "宇和島"],
		高知: ["高知市", "南国", "四万十", "香南", "香美"],
	},
	"九州・沖縄": {
		福岡: ["天神・大名", "博多駅周辺", "中洲・川端", "北九州・小倉", "久留米", "糸島"],
		鹿児島: ["天文館", "鹿児島中央駅周辺", "谷山", "霧島", "指宿", "鹿屋", "奄美"],
		熊本: ["熊本市中心部", "八代", "荒尾", "玉名", "阿蘇"],
		佐賀: ["佐賀市", "唐津", "鳥栖", "伊万里", "武雄"],
		長崎: ["長崎市", "佐世保", "諫早", "大村", "島原"],
		大分: ["大分市", "別府", "中津", "日田", "佐伯・臼杵"],
		宮崎: ["宮崎市", "都城", "延岡", "日向", "日南"],
		沖縄: ["那覇・国際通り", "沖縄市・北谷", "宜野湾", "浦添", "名護・本部"],
	},
};

function AreaSelectionContent({ passcode }: { passcode: string }) {
	const router = useRouter();
	const [step, setStep] = useState<"region" | "pref" | "area" | "result">("region");
	const [selectedRegion, setSelectedRegion] = useState("");
	const [selectedPref, setSelectedPref] = useState("");
	const [selectedArea, setSelectedArea] = useState("");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [initializing, setInitializing] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

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
				setInitializing(false);
				return;
			}

			setGroupId(joinResult.data);
			setUserId(authData.user.id);

			const { data: memberData } = await supabase
				.from("group_members")
				.select("selected_area")
				.eq("group_id", joinResult.data)
				.eq("user_id", authData.user.id)
				.maybeSingle<{ selected_area: string | null }>();

			if (memberData?.selected_area) {
				setSelectedArea(memberData.selected_area);
				for (const region of Object.keys(areaData)) {
					for (const pref of Object.keys(areaData[region])) {
						if (areaData[region][pref].includes(memberData.selected_area)) {
							setSelectedRegion(region);
							setSelectedPref(pref);
							setStep("result");
							break;
						}
					}
				}
			}

			setInitializing(false);
		};

		void initialize();
	}, [passcode, router]);

	const saveArea = async (nextArea: string) => {
		if (!groupId || !userId) {
			return;
		}

		setSaving(true);
		setMessage(null);
		const supabase = getSupabaseClient();
		const { error } = await supabase.from("group_members").upsert(
			{
				group_id: groupId,
				user_id: userId,
				selected_area: nextArea,
				is_ready: false,
			},
			{ onConflict: "group_id,user_id" },
		);

		setSaving(false);
		if (error) {
			setMessage("エリアの保存に失敗しました。もう一度お試しください。");
		}
	};

	const renderContent = () => {
		switch (step) {
			case "region":
				return (
					<div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
						<p className="text-[#BABABA] text-xs mb-6 text-center">地方を選択してください</p>
						<div className="grid grid-cols-1 gap-3">
							{Object.keys(areaData).map((region) => (
								<button
									key={region}
									onClick={() => {
										setSelectedRegion(region);
										setStep("pref");
									}}
									className="w-full text-left text-sm font-bold text-[#5A5A5A] py-3.5 px-6 bg-[#D6F8C2]/20 rounded-2xl flex justify-between items-center active:scale-95 transition-all"
								>
									{region} <span className="text-[#389E95] text-lg">›</span>
								</button>
							))}
						</div>
					</div>
				);

			case "pref":
				return (
					<div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
						<div className="flex justify-between items-center mb-6">
							<button onClick={() => setStep("region")} className="text-[#389E95] text-[10px] font-bold py-1 px-3 bg-[#D6F8C2] rounded-full">
								‹ 地方選択へ
							</button>
							<p className="text-[#BABABA] text-xs font-bold">{selectedRegion}</p>
						</div>
						<div className="grid grid-cols-2 gap-3 max-h-100 overflow-y-auto pr-1">
							{Object.keys(areaData[selectedRegion]).map((pref) => (
								<button
									key={pref}
									onClick={() => {
										setSelectedPref(pref);
										setStep("area");
									}}
									className="text-sm font-bold text-[#5A5A5A] py-4 rounded-xl border-2 border-[#389E95]/5 bg-white shadow-sm active:bg-[#D6F8C2]"
								>
									{pref}
								</button>
							))}
						</div>
					</div>
				);

			case "area":
				return (
					<div className="w-full bg-white border-2 border-[#389E95]/20 rounded-[30px] p-6 shadow-sm">
						<div className="flex justify-between items-center mb-6">
							<button onClick={() => setStep("pref")} className="text-[#389E95] text-[10px] font-bold py-1 px-3 bg-[#D6F8C2] rounded-full">
								‹ 都道府県へ
							</button>
							<p className="text-[#BABABA] text-xs font-bold">{selectedPref}</p>
						</div>
						<div className="space-y-3 max-h-100 overflow-y-auto pr-1">
							{areaData[selectedRegion][selectedPref].map((area) => (
								<button
									key={area}
									onClick={() => {
										setSelectedArea(area);
										setStep("result");
										void saveArea(area);
									}}
									className="w-full text-left text-sm font-bold text-[#5A5A5A] py-4 border-b-2 border-[#D6F8C2]/30 flex items-center gap-4 px-2 active:bg-[#D6F8C2]/20 rounded-lg transition-colors"
								>
									<span className="w-5 h-5 rounded-full border-2 border-[#389E95] shrink-0"></span>
									{area}
								</button>
							))}
						</div>
					</div>
				);

			case "result":
				return (
					<div className="w-full grow flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
						<div className="w-full bg-white border-4 border-[#389E95] rounded-[35px] p-10 flex flex-col items-center gap-5 shadow-xl text-center">
							<span className="text-5xl">📍</span>
							<div className="flex flex-col gap-2">
								<span className="text-[#BABABA] text-sm font-bold">{selectedPref}</span>
								<span className="text-[#389E95] text-3xl font-black tracking-wider leading-tight">{selectedArea}</span>
							</div>
							<span className="text-[#389E95]/70 text-xs font-bold mt-4 bg-[#D6F8C2]/50 px-4 py-1 rounded-full">このエリアで探します！</span>
						</div>
					</div>
				);
		}
	};

	if (initializing) {
		return <div className="pt-20 text-[#389E95] font-bold text-center">準備中...</div>;
	}

	return (
		<div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-12 px-8 min-h-[calc(100vh-100px)] select-none">
			<div className="w-full flex justify-between items-center mb-6 px-2 relative shrink-0">
				<div className="absolute top-1/2 left-0 w-full h-0.5 bg-white z-0 -translate-y-1/2 opacity-50"></div>
				{["ホーム", "場所", "目的", "条件"].map((label, i) => (
					<div key={label} className="relative z-10 flex flex-col items-center gap-1">
						{i === 1 && (
							<div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
								<Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
							</div>
						)}
						<div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 1 ? "bg-[#389E95] border-[#389E95] scale-110 shadow-md" : "bg-white border-[#389E95]/30"}`}></div>
						<span className={`text-[10px] font-black ${i <= 1 ? "text-[#389E95]" : "text-[#389E95]/40"}`}>{label}</span>
					</div>
				))}
			</div>

			<div className="w-full grow flex flex-col relative z-20">{renderContent()}</div>
			{message ? <p className="w-full mt-3 text-sm text-[#5A5A5A] text-center">{message}</p> : null}

			<div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto border-t border-white/20">
				<button
					onClick={() => {
						if (step === "result") {
							setStep("area");
						} else if (step === "area") {
							setStep("pref");
						} else if (step === "pref") {
							setStep("region");
						} else {
							router.push(`/groups/${passcode}`);
						}
					}}
					className="flex-1 bg-white rounded-2xl py-3 flex items-center justify-center active:scale-95 transition-all shadow-sm"
				>
					<span className="text-[#389E95] font-black tracking-widest">戻る</span>
				</button>
				<Link
					href={step === "result" ? `/groups/${passcode}/purpose` : "#"}
					className={`flex-1 bg-white rounded-2xl py-3 flex items-center justify-center transition-all ${step !== "result" || saving ? "opacity-30 grayscale pointer-events-none" : "active:scale-95 shadow-md"}`}
				>
					<span className="text-[#389E95] font-black tracking-widest">次へ</span>
				</Link>
			</div>

			<div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
		</div>
	);
}

export default function GroupAreaPage() {
	const params = useParams<{ id: string }>();

	return (
		<main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden">
			<TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />
			<HomeHeaderBar rightSlot={<TeamMembersHeader passcode={params.id} />} />
			<Suspense fallback={<div className="pt-20 text-[#389E95] font-bold">地図を広げています...</div>}>
				<AreaSelectionContent passcode={params.id} />
			</Suspense>
		</main>
	);
}