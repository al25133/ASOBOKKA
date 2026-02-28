"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/ui/account-menu';
import { TopLogoBar } from '@/components/ui/app-header';

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
      setMessage('5桁の番号を入力してね！');
      return;
    }

    setMessage(null);
    router.push(`/groups/${normalized}`);
  };

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      
      {/* 🐧 1. ロゴエリア */}
      <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />

      {/* 🟢 2. ヘッダーバー */}
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
        <Link href="/">
          <Image src="/homelogo.svg" alt="home" width={32} height={32} />
        </Link>
        <div className="ml-auto">
          <AccountMenu avatarId={avatarId} />
        </div>
      </header>

      {/* 🐾 メインコンテンツ */}
      <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-24 px-10 pb-40">
        <div className="relative w-full mb-16 flex justify-end">
          <div className="absolute -left-6 -bottom-4 w-28 h-28 z-20">
            <Image src="/小さいペンギン白 1.svg" alt="ペンギン" width={112} height={112} className="object-contain" />
          </div>

          <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] w-full ml-12 p-6 min-h-25 flex items-center justify-center relative shadow-sm">
            <input 
              type="text"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="番号を入力してね"
              inputMode="numeric"
              maxLength={5}
              className="w-full text-center text-3xl font-black text-[#5A5A5A] outline-none placeholder:text-[#BABABA] placeholder:text-sm placeholder:font-normal bg-transparent"
            />
            <div className="absolute top-[52%] -left-3 w-5 h-5 bg-white border-b-[3px] border-l-[3px] border-[#389E95] rotate-45 -translate-y-1/2"></div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5 w-full">
          <button 
            onClick={handleJoin}
            className="w-52 bg-[#52A399] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg tracking-widest"
          >
            グループに入る
          </button>
          {message ? <p className="text-sm text-red-600 font-bold">{message}</p> : null}
          <Link href="/" className="w-32 bg-white border-2 border-[#52A399]/30 text-[#52A399] font-black py-2 rounded-xl text-center shadow-sm active:scale-95 transition-all text-sm">戻る</Link>
        </div>
      </div>

      {/* ✨ 3. 下部の白い背景：控えめでなだらかな逆カーブ */}
      <div className="fixed bottom-0 left-0 w-full h-44 z-0 pointer-events-none">
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          className="w-full h-full filter drop-shadow-[0_-8px_15px_rgba(0,0,0,0.04)]"
        >
          {/* Q50,35 の 35 を小さくするともっと平らに、大きくすると深く凹みます */}
          <path 
            d="M0,0 Q50,35 100,0 V100 H0 Z" 
            fill="white" 
          />
        </svg>
      </div>

    </main>
  );
}