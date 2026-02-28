"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu, HeaderHamburger } from '@/components/ui/account-menu';
import { HomeHeaderBar, TopLogoBar } from '@/components/ui/app-header';
import { BottomCurveBackground } from '@/components/ui/decorative-layout';

export default function GroupSearch() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [avatarId, setAvatarId] = useState('1');
  const [message, setMessage] = useState<string | null>(null);

  const [groupCode, setGroupCode] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace('/login');
        return;
      }

      const avatar = data.user.user_metadata?.avatar;
      if (typeof avatar === 'number' || typeof avatar === 'string') {
        setAvatarId(String(avatar));
      }

      setAuthChecked(true);
    };

    void checkAuth();
  }, [router]);

  if (!authChecked) {
    return <main className="min-h-screen bg-[#D6F8C2]" />;
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = groupCode.replace(/\D/g, '').slice(0, 5);
    if (normalized.length !== 5) {
      setMessage('5桁のグループ番号を入力してください。');
      return;
    }

    setMessage(null);
    router.push(`/groups/${normalized}`);
  };

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      
      {/* 🐧 ロゴエリア */}
      <TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} />

      {/* 🟢 ヘッダーバー：ブランドカラー #389E95 */}
      <HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />

      {/* 🐾 メインコンテンツ：ペンギンと入力吹き出し */}
      <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-32 px-10 pb-40">
        
        <div className="relative w-full mb-20 flex justify-end">
          {/* ✨ 左側にいるペンギン（小さいペンギン白 1.svg） */}
          <div className="absolute -left-6 -bottom-4 w-28 h-28 z-20">
            <Image src="/小さいペンギン白 1.svg" alt="ペンギン" width={112} height={112} className="object-contain" />
          </div>

          {/* 💬 入力用の吹き出し */}
          <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] w-full ml-12 p-6 min-h-25 flex items-center justify-center relative shadow-sm">
            <input 
              type="text"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="番号をここに入力してね"
              inputMode="numeric"
              maxLength={5}
              className="w-full text-center text-3xl font-bold text-[#5A5A5A] outline-none placeholder:text-[#BABABA] placeholder:text-sm placeholder:font-normal"
            />
            {/* 吹き出しのしっぽ（左側のペンギンへ向ける） */}
            <div className="absolute top-[52%] -left-3 w-5 h-5 bg-white border-b-[3px] border-l-[3px] border-[#389E95] rotate-45 -translate-y-1/2"></div>
          </div>
        </div>

        {/* 🔘 アクションボタン */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button 
            onClick={handleJoin}
            className="w-48 bg-[#52A399] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg"
          >
            グループに入る
          </button>
          {message ? <p className="text-sm text-red-600">{message}</p> : null}
          
          <Link 
            href="/"
            className="w-32 bg-white border-2 border-[#52A399]/30 text-[#52A399] font-bold py-2 rounded-xl text-center shadow-sm active:scale-95 transition-all"
          >
            戻る
          </Link>
        </div>
      </div>

      {/* ⚪️ 下部の白い曲線背景 */}
      <BottomCurveBackground className="h-40 rounded-t-[100px]" />

    </main>
  );
}