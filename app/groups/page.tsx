"use client";

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// --- 💡 番号入力画面のメインコンテンツ ---
function SearchContent() {
  const router = useRouter();
  
  // 入力されたグループ番号
  const [groupCode, setGroupCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupCode.length > 0) {
      // 入力された番号を持って、メンバー一覧画面（createページ）へ
      router.push(`/groups/create?code=${groupCode}`);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-[402px] flex flex-col items-center pt-32 px-10 pb-40 select-none">
      
      {/* 💬 入力用の吹き出し */}
      <div className="relative w-full mb-20 flex justify-end">
        {/* 左側にいるペンギン（小さいペンギン白 1.svg） */}
        <div className="absolute -left-6 -bottom-4 w-28 h-28 z-20">
          <Image src="/小さいペンギン白 1.svg" alt="" width={112} height={112} className="object-contain" />
        </div>

        <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] w-full ml-12 p-6 min-h-[100px] flex items-center justify-center relative shadow-sm">
          <input 
            type="text"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value)}
            placeholder="番号をここに入力してね"
            className="w-full text-center text-2xl font-bold text-[#5A5A5A] outline-none placeholder:text-[#BABABA] placeholder:text-sm placeholder:font-normal"
          />
          {/* 吹き出しのしっぽ（左側のペンギンへ向ける） */}
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white border-b-[3px] border-l-[3px] border-[#389E95] rotate-[25deg] -translate-y-1/2"></div>
        </div>
      </div>

      {/* 🔘 アクションボタン */}
      <div className="flex flex-col items-center gap-4 w-full relative z-30">
        <button 
          onClick={handleJoin}
          className="w-48 bg-[#52A399] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg"
        >
          グループに入る
        </button>
        
        <Link 
          href="/groups"
          className="w-32 bg-white border-2 border-[#52A399]/30 text-[#52A399] font-bold py-2 rounded-xl text-center shadow-sm active:scale-95 transition-all"
        >
          戻る
        </Link>
      </div>
    </div>
  );
}

// --- 🐧 ページの主役（export default） ---
export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col relative items-center overflow-hidden select-none">
      
      {/* 🟢 ヘッダー */}
      <div className="relative z-20 flex justify-center py-4 w-full bg-[#D6F8C2]">
        <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
      </div>

      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
        <Link href="/groups" className="active:scale-90 transition-transform">
          <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
        </Link>
        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="w-9 h-9 bg-white/20 rounded-full animate-pulse" />}>
            <AvatarIcon />
          </Suspense>
          {/* 細身のハンバーガーメニュー */}
          <div className="flex flex-col gap-[5px] w-7 ml-1 cursor-pointer p-1">
            <div className="h-0.5 bg-white rounded-full w-full"/>
            <div className="h-0.5 bg-white rounded-full w-full"/>
            <div className="h-0.5 bg-white rounded-full w-full"/>
          </div>
        </div>
      </header>

      {/* 💡 真っ白な画面を防ぐ Suspense */}
      <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold">読み込み中...</div>}>
        <SearchContent />
      </Suspense>

      {/* 背景の白い曲線 */}
      <div className="fixed bottom-0 left-0 w-full h-40 bg-white rounded-t-[100px] z-0 pointer-events-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"></div>
    </main>
  );
}

// アバターアイコン部分を分離して Suspense に対応
function AvatarIcon() {
  const avatarId = '1';
  return (
    <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm">
      <Image src={`/avatars/avatar${avatarId}.svg`} alt="" width={36} height={36} />
    </div>
  );
}