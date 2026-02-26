"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function GroupCreateContent() {
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar') || '1';
  const [groupCode] = useState("01928"); 
  const [members] = useState([
    { id: 1, name: "いちろー", avatar: "avatar1" },
    { id: 8, name: "ふたこ", avatar: "avatar8" },
    { id: 5, name: "さぶろー", avatar: "avatar5" },
  ]);

  return (
    <div className="relative z-10 w-full max-w-[402px] flex flex-col items-center pt-10 px-6 pb-40">
      <div className="relative w-full mb-24">
        <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] p-6 pt-5 relative z-10 shadow-sm">
          <p className="text-[#389E95] text-[10px] font-bold mb-1">グループの番号は</p>
          <p className="text-[#5A5A5A] text-center text-5xl font-bold tracking-widest my-3">{groupCode}</p>
          <p className="text-[#389E95] text-[10px] font-bold text-right">みんなに教えてね！</p>
          <div className="absolute top-[75%] -right-3 w-6 h-6 bg-white border-t-[3px] border-r-[3px] border-[#389E95] rotate-[30deg] -translate-y-1/2"></div>
        </div>
        <div className="absolute -right-4 -bottom-32 w-36 h-36 z-20">
          <Image src="/大きいペンギン白 1.svg" alt="ペンギン" width={144} height={144} className="object-contain" />
        </div>
      </div>

      <div className="w-full mt-4">
        <p className="text-[#389E95] text-sm font-bold mb-2 ml-2">メンバー</p>
        <div className="bg-white rounded-[30px] p-8 min-h-[280px] shadow-sm border border-[#389E95]/10">
          <div className="grid grid-cols-3 gap-y-8 gap-x-4">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full border-2 border-[#D6F8C2] overflow-hidden bg-white shadow-sm">
                  <Image src={`/avatars/${member.avatar}.svg`} alt={member.name} width={56} height={56} />
                </div>
                <span className="text-[10px] text-[#5A5A5A] font-bold">{member.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GroupCreatePage() {
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar') || '1';

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      <div className="relative z-20 flex justify-center py-4 w-full">
        <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
      </div>

      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
        <Link href="/groups" className="active:scale-90 transition-transform">
          <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm">
            <Image src={`/avatars/avatar${avatarId}.svg`} alt="マイアイコン" width={36} height={36} />
          </div>
          <div className="flex flex-col gap-1 w-7 cursor-pointer"><div className="h-0.5 bg-white rounded-full"/><div className="h-0.5 bg-white rounded-full"/><div className="h-0.5 bg-white rounded-full"/></div>
        </div>
      </header>

      <Suspense fallback={<div className="pt-20 text-[#389E95] font-bold">読み込み中...</div>}>
        <GroupCreateContent />
      </Suspense>

      <div className="fixed bottom-10 z-40 w-full max-w-[360px] bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3">
        <Link href="/groups" className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center">
          <span className="text-[#389E95] font-bold">戻る</span>
        </Link>
        {/* ✨ リンク先を /groups/area に変更！ */}
        <Link href={`/groups/area?avatar=${avatarId}`} className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center">
          <span className="text-[#389E95] font-bold">診断スタート</span>
        </Link>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[140px] z-0 pointer-events-none"></div>
    </main>
  );
}