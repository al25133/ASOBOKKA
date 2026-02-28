"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/ui/account-menu';
import { HomeHeaderBar, TopLogoBar } from '@/components/ui/app-header';
import { FootprintsStage } from '@/components/ui/decorative-layout';

function GroupsHomeContent() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'authed' | 'guest'>('checking');
  const [userAvatarId, setUserAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setAuthState('guest');
        router.replace('/login');
        return;
      }

      const avatar = data.user.user_metadata?.avatar;
      if (typeof avatar === 'number' || typeof avatar === 'string') {
        setUserAvatarId(String(avatar));
      }

      setAuthState('authed');
    };

    void checkAuth();
  }, [router]);

  if (authState === 'checking') {
    return (
      <main className="min-h-screen bg-[#D6F8C2] flex items-center justify-center">
        <p className="text-[#389E95] font-bold">読み込み中...</p>
      </main>
    );
  }

  if (authState === 'guest') {
    return null;
  }

  const avatarId = userAvatarId || '1';

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      
      {/* 🐧 ロゴエリア（最上部） */}
      <TopLogoBar className="bg-[#D6F8C2]" />

      {/* 🟢 ヘッダーバー：選択したアイコンを表示 */}
      <HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />

      {/* 🐾 【足跡・ボタン配置エリア：400x691】 */}
      <FootprintsStage>
        <div className="flex flex-col items-center justify-center h-full gap-16">
          
          {/* 1. グループ作成エリア */}
          <div className="relative w-full flex justify-center max-w-85 pr-10">
            <Link href="/groups/create" className="relative bg-white border-4 border-[#389E95] rounded-[25px] px-10 py-5 shadow-lg active:scale-95 transition-all">
              <span className="text-[#389E95] text-xl font-bold">グループ作成</span>
              <div className="absolute top-[52%] -right-3 w-5 h-5 bg-white border-t-4 border-r-4 border-[#389E95] rotate-45 -translate-y-1/2"></div>
            </Link>
            {/* 右のペンギン（大） */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32">
              <Image src="/大きいペンギン白 1.svg" alt="ペンギン大" width={128} height={128} className="object-contain" />
            </div>
          </div>

          {/* 2. グループに入るエリア */}
          <div className="relative w-full flex justify-center max-w-85 pl-10">
            {/* 左のペンギン（小） */}
            <div className="absolute -left-4 -top-8 w-28 h-28">
              <Image src="/小さいペンギン白 1.svg" alt="ペンギン小" width={112} height={112} className="object-contain" />
            </div>
            <Link href="/groups/search" className="relative bg-white border-4 border-[#389E95] rounded-[25px] px-10 py-5 shadow-lg active:scale-95 transition-all">
              <span className="text-[#389E95] text-xl font-bold">グループに入る</span>
              <div className="absolute top-[52%] -left-3 w-5 h-5 bg-white border-b-4 border-l-4 border-[#389E95] rotate-45 -translate-y-1/2"></div>
            </Link>
          </div>

        </div>
      </FootprintsStage>
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