"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function GroupsHomeContent() {
  const searchParams = useSearchParams();
  // 登録画面から渡されたアバター番号を取得（デフォルトは1）
  const avatarId = searchParams.get('avatar') || '1';

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      
      {/* 🐧 ロゴエリア（最上部） */}
      <div className="relative z-20 flex justify-center py-4 w-full bg-[#D6F8C2]">
        <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
      </div>

      {/* 🟢 ヘッダーバー：選択したアイコンを表示 */}
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
        <Link href="/" className="active:scale-90 transition-transform">
          <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
        </Link>
        
        <div className="flex items-center gap-3">
          {/* ✨ 動的なユーザーアイコン：avatarId によって画像が変わります */}
          <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm">
            <Image 
              src={`/avatars/avatar${avatarId}.svg`} 
              alt="マイアイコン" 
              width={36} 
              height={36} 
            />
          </div>
          {/* ハンバーガーメニュー */}
          <div className="flex flex-col gap-1 w-7 cursor-pointer ml-1">
            <div className="h-0.5 w-full bg-white rounded-full"></div>
            <div className="h-0.5 w-full bg-white rounded-full"></div>
            <div className="h-0.5 w-full bg-white rounded-full"></div>
          </div>
        </div>
      </header>

      {/* 🐾 【足跡・ボタン配置エリア：400x691】 */}
      <div className="relative z-10 w-[400px] h-[691px] flex flex-col items-center justify-center">
        
        {/* --- 背景の足跡レイヤー：位置をUI通りに微調整 --- */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* 右上の足跡：下端がペンギンのすぐ上に来るように配置 */}
          <div className="absolute bottom-[380px] -right-10 w-[320px] h-[320px] opacity-30">
            <Image src="/足跡右上.svg" alt="" fill className="object-contain" />
          </div>

          {/* 左下の足跡：ペンギンの足元から画面外へ流れるように配置 */}
          <div className="absolute top-[350px] -left-12 w-[340px] h-[340px] opacity-30">
            <Image src="/足跡左下.svg" alt="" fill className="object-contain" />
          </div>
        </div>

        {/* --- コンテンツレイヤー --- */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-16">
          
          {/* 1. グループ作成エリア */}
          <div className="relative w-full flex justify-center max-w-[340px] pr-10">
            <Link href="/groups/create" className="relative bg-white border-[4px] border-[#389E95] rounded-[25px] px-10 py-5 shadow-lg active:scale-95 transition-all">
              <span className="text-[#389E95] text-xl font-bold">グループ作成</span>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white border-t-[4px] border-r-[4px] border-[#389E95] rotate-[25deg] -translate-y-1/2"></div>
            </Link>
            {/* 右のペンギン（大） */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32">
              <Image src="/大きいペンギン白 1.svg" alt="ペンギン大" width={128} height={128} className="object-contain" />
            </div>
          </div>

          {/* 2. グループに入るエリア */}
          <div className="relative w-full flex justify-center max-w-[340px] pl-10">
            {/* 左のペンギン（小） */}
            <div className="absolute -left-4 -top-8 w-28 h-28">
              <Image src="/小さいペンギン白 1.svg" alt="ペンギン小" width={112} height={112} className="object-contain" />
            </div>
            <Link href="/groups/search" className="relative bg-white border-[4px] border-[#389E95] rounded-[25px] px-10 py-5 shadow-lg active:scale-95 transition-all">
              <span className="text-[#389E95] text-xl font-bold">グループに入る</span>
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white border-b-[4px] border-l-[4px] border-[#389E95] rotate-[25deg] -translate-y-1/2"></div>
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}

export default function GroupsHome() {
  return (
    <Suspense fallback={null}>
      <GroupsHomeContent />
    </Suspense>
  );
}