"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// --- 型定義 ---
interface ConditionState {
  end: number;
  stance: number;
  owd: number;
  me: number;
  dget: number; // 予算
}

type ConditionSelectionContentProps = {
  avatarId: string;
};

function ConditionSelectionContent({ avatarId }: ConditionSelectionContentProps) {
  const [selections, setSelections] = useState<ConditionState>({
    end: 3,
    stance: 3,
    owd: 3,
    me: 3,
    dget: 3000, // 初期予算を3000円に設定
  });

  const conditionItems = [
    { key: 'end', labelL: "のんびり", labelR: "活発" },
    { key: 'stance', labelL: "近め", labelR: "遠くてもいい" },
    { key: 'owd', labelL: "静か", labelR: "にぎやか" },
    { key: 'me', labelL: "短時間", labelR: "半日以上" },
  ] as const;

  return (
    <div className="relative z-10 w-full max-w-[402px] flex flex-col items-center pt-12 px-6 min-h-[calc(100vh-100px)] select-none">
      
      {/* 🧭 プログレスバー */}
      <div className="w-full flex justify-between items-center mb-10 px-4 relative flex-shrink-0">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white z-0 -translate-y-1/2 opacity-50"></div>
        {['ホーム', '場所', '目的', '条件'].map((label, i) => (
          <div key={label} className="relative z-10 flex flex-col items-center gap-1">
            {i === 3 && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
              </div>
            )}
            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 3 ? 'bg-[#389E95] border-[#389E95] scale-110 shadow-md' : 'bg-white border-[#389E95]/30'}`}></div>
            <span className={`text-[10px] font-black ${i <= 3 ? 'text-[#389E95]' : 'text-[#389E95]/40'}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* 🎚️ 価値観選択（5個の丸いボタン） */}
      <div className="flex flex-col gap-8 w-full">
        {conditionItems.map((item) => (
          <div key={item.key} className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-black text-[#389E95]">{item.labelL}</span>
              <span className="text-xs font-black text-[#389E95]">{item.labelR}</span>
            </div>
            
            <div className="flex justify-between items-center relative px-2">
              <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-[#389E95]/20 -translate-y-1/2 z-0"></div>
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setSelections({ ...selections, [item.key]: val })}
                  className={`
                    relative z-10 w-8 h-8 rounded-full border-2 transition-all duration-200
                    ${selections[item.key] === val 
                      ? 'bg-[#389E95] border-[#389E95] scale-125 shadow-lg' 
                      : 'bg-white border-[#389E95]/30'
                    }
                  `}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto ${selections[item.key] === val ? 'bg-white' : 'bg-[#389E95]/20'}`}></div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 💰 予算バー（新設） */}
        <div className="flex flex-col gap-3 mt-4 mb-32">
          <div className="flex justify-between items-center px-2">
            <span className="text-xs font-black text-[#389E95]">予算</span>
            <span className="text-sm font-black text-[#389E95]">
              ¥{selections.dget.toLocaleString()} <span className="text-[10px]">以内</span>
            </span>
          </div>
          <div className="relative px-2 flex items-center">
            <input
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={selections.dget}
              onChange={(e) => setSelections({ ...selections, dget: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-[#389E95] shadow-inner"
              style={{
                backgroundImage: `linear-gradient(to right, #389E95 ${(selections.dget - 0) / (100000 - 0) * 100}%, transparent 0%)`
              }}
            />
          </div>
          <div className="flex justify-between px-2 opacity-40 text-[9px] font-bold text-[#389E95]">
            <span>¥0</span>
            <span>¥100,000+</span>
          </div>
        </div>
      </div>

      {/* 🔘 ナビゲーション */}
      <div className="fixed bottom-10 z-40 w-full max-w-[360px] bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto">
        <Link href={`/groups/purpose?avatar=${avatarId}`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black tracking-widest text-sm">戻る</span>
        </Link>
        <Link href={`/groups/result?avatar=${avatarId}`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black tracking-widest text-sm">結果表示</span>
        </Link>
      </div>
      <div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
    </div>
  );
}

function ConditionPageContent() {
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar') || '1';

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden select-none">
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] mt-12 shadow-sm">
        <Link href="/groups"><Image src="/homelogo.svg" alt="" width={32} height={32} /></Link>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
            {[1, 8, 5].map((id) => (
              <div key={id} className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-md">
                <Image src={`/avatars/avatar${id}.svg`} alt="" width={36} height={36} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-[5px] w-7 ml-1 cursor-pointer p-1">
            <div className="h-0.5 bg-white rounded-full w-full"/><div className="h-0.5 bg-white rounded-full w-full"/><div className="h-0.5 bg-white rounded-full w-full"/>
          </div>
        </div>
      </header>
      <ConditionSelectionContent avatarId={avatarId} />
    </main>
  );
}

export default function ConditionPage() {
  return (
    <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
      <ConditionPageContent />
    </Suspense>
  );
}