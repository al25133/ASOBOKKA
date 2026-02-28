"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function PurposeSelectionContent() {
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar') || '1';

  // 📂 フォルダ名 /purpose/ 内のファイル名に一致させています
  const purposes = [
    { id: 1, title: "ショッピング", sub: "宝探ししたい", fileName: "shopping.svg" },
    { id: 2, title: "ハンドメイド", sub: "ものづくりしたい", fileName: "handmade.svg" },
    { id: 3, title: "カフェ", sub: "ゆっくり語りたい", fileName: "cafe.svg" },
    { id: 4, title: "ミュージアム", sub: "静かに刺激を受けたい", fileName: "museum.svg" },
    { id: 5, title: "観光", sub: "ちょっと冒険したい", fileName: "sightseeing.svg" },
    { id: 6, title: "食事", sub: "がっつり満たされたい", fileName: "meal.svg" },
    { id: 7, title: "エンタメ・文化", sub: "自由に楽しみたい", fileName: "entartainment.svg" },
    { id: 8, title: "アウトドア", sub: "体を動かしたい", fileName: "outdoor.svg" },
  ];

  const [selected, setSelected] = useState<number[]>([]);

  return (
    <div className="relative z-10 w-full max-w-[402px] flex flex-col items-center pt-12 px-6 min-h-[calc(100vh-100px)] select-none">
      
      {/* 🧭 プログレスバー */}
      <div className="w-full flex justify-between items-center mb-10 px-4 relative flex-shrink-0">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white z-0 -translate-y-1/2 opacity-50"></div>
        {['ホーム', '場所', '目的', '条件'].map((label, i) => (
          <div key={label} className="relative z-10 flex flex-col items-center gap-1">
            {i === 2 && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 animate-bounce duration-700">
                <Image src="/小さいペンギン白 1.svg" alt="" width={28} height={28} className="object-contain" />
              </div>
            )}
            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${i <= 2 ? 'bg-[#389E95] border-[#389E95] scale-110 shadow-md' : 'bg-white border-[#389E95]/30'}`}></div>
            <span className={`text-[10px] font-black ${i <= 2 ? 'text-[#389E95]' : 'text-[#389E95]/40'}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* 🖼️ 目的カード */}
      <div className="grid grid-cols-2 gap-3 w-full pb-32">
        {purposes.map((p) => (
          <div 
            key={p.id} 
            onClick={() => setSelected(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} 
            className="relative h-40 rounded-[25px] overflow-hidden shadow-md active:scale-95 bg-white"
          >
            <div className="absolute inset-0">
              {/* ✨ 正しいパス /purpose/ に修正しました */}
              <Image src={`/purpose/${p.fileName}`} alt={p.title} fill className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-sm font-black">{p.title}</p>
              <p className="text-[8px] font-bold">{p.sub}</p>
            </div>
            <div className="absolute bottom-4 right-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill={selected.includes(p.id) ? "#FF5A5F" : "none"} viewBox="0 0 24 24" strokeWidth={2.5} stroke={selected.includes(p.id) ? "#FF5A5F" : "white"} className="w-5 h-5 transition-colors drop-shadow-md">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 🔘 ナビゲーション */}
      <div className="fixed bottom-10 z-40 w-full max-w-[360px] bg-[#52A399] rounded-[30px] p-3 shadow-2xl flex justify-between gap-3 mx-auto">
        <Link href={`/groups/area?avatar=${avatarId}`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black tracking-widest text-sm">戻る</span>
        </Link>
        <Link href={`/groups/condition?avatar=${avatarId}`} className="flex-1 bg-white rounded-2xl py-3 text-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black tracking-widest text-sm">次へ</span>
        </Link>
      </div>
      <div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[120px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
    </div>
  );
}

export default function PurposePage() {
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
                {/* 修正：バッククォート `` を使い、アバターを表示 */}
                <Image src={`/avatars/avatar${id}.svg`} alt="" width={36} height={36} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-[5px] w-7 ml-1 cursor-pointer p-1">
            <div className="h-0.5 bg-white rounded-full w-full"/><div className="h-0.5 bg-white rounded-full w-full"/><div className="h-0.5 bg-white rounded-full w-full"/>
          </div>
        </div>
      </header>
      <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold text-center">読み込み中...</div>}>
        <PurposeSelectionContent />
      </Suspense>
    </main>
  );
}