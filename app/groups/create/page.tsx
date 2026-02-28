"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TopLogoBar } from '@/components/ui/app-header';
import { TeamMembersHeader } from '@/components/ui/team-members-header';

type GroupMember = {
  user_id: string;
  nickname: string;
  avatar: string;
};

export default function GroupCreate() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMembers = async (targetGroupId: string) => {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setMessage('セッションが確認できませんでした。再ログインしてください。');
      return;
    }

    const response = await fetch('/api/groups/members', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId: targetGroupId }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(result?.message ?? 'メンバー情報の取得に失敗しました。');
      return;
    }

    const result = (await response.json()) as { members?: GroupMember[] };
    setMembers(result.members ?? []);
  };

  useEffect(() => {
    const initialize = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace('/login');
        return;
      }

      setUserId(data.user.id);

      const { data: createdGroup, error } = await supabase.rpc('create_group_with_unique_passcode');
      if (error || !createdGroup?.[0]) {
        setMessage('グループ作成に失敗しました。');
        setAuthChecked(true);
        return;
      }

      setGroupId(createdGroup[0].group_id);
      setGroupCode(createdGroup[0].passcode);
      await fetchMembers(createdGroup[0].group_id);

      setAuthChecked(true);
    };

    void initialize();
  }, [router]);

  useEffect(() => {
    if (!groupId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`group-create-members-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
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
  }, [groupId]);

  if (!authChecked) {
    return <main className="min-h-screen bg-[#D6F8C2]" />;
  }

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      
      {/* 🐧 ロゴエリア：背景色を薄い緑に固定し、三本線を消去 */}
      <TopLogoBar className="bg-[#D6F8C2]" rightSlot={<div />} />

      {/* 🟢 濃い緑のバー：アバターのみ右端に表示 */}
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76] shadow-sm">
        <Link href="/groups">
          <Image src="/homelogo.svg" alt="home" width={32} height={32} />
        </Link>
        <div className="ml-auto">
          <TeamMembersHeader members={members} />
        </div>
      </header>

      {/* 🐾 メインコンテンツ */}
      <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-10 px-6 pb-40">
        
        {/* 💬 グループ番号の吹き出し */}
        <div className="relative w-full mb-24">
          <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] p-6 pt-5 relative z-10 shadow-sm">
            <p className="text-[#389E95] text-[10px] font-black mb-1">グループの番号は</p>
            <p className="text-[#5A5A5A] text-center text-5xl font-black tracking-widest my-3">{groupCode}</p>
            <p className="text-[#389E95] text-[10px] font-black text-right">みんなに教えてね！</p>
            <div className="absolute top-[77%] -right-3 w-5 h-5 bg-white border-t-[3px] border-r-[3px] border-[#389E95] rotate-45 -translate-y-1/2"></div>
          </div>
          
          <div className="absolute -right-4 -bottom-28 w-36 h-36 z-20">
            <Image 
              src="/大きいペンギン白 1.svg" 
              alt="ペンギン" 
              width={144} 
              height={144} 
              className="object-contain" 
            />
          </div>
        </div>

        {/* 👥 メンバーリスト */}
        <div className="w-full mt-4">
          <p className="text-[#389E95] text-sm font-black mb-2 ml-2">メンバー</p>
          <div className="bg-white rounded-[30px] p-8 min-h-70 shadow-sm border border-[#389E95]/10">
            {message ? <p className="mb-3 text-sm text-red-600 font-bold">{message}</p> : null}
            <div className="grid grid-cols-3 gap-y-8 gap-x-4">
              {members.map((member) => (
                <div key={member.user_id} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full border-2 border-[#D6F8C2] overflow-hidden bg-white shadow-sm">
                    <Image src={`/avatars/avatar${member.avatar}.svg`} alt="メンバー" width={56} height={56} />
                  </div>
                  <span className="text-[10px] text-[#5A5A5A] font-black">
                    {member.user_id === userId ? 'あなた' : member.nickname}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🔘 ナビゲーション */}
      <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3 mx-auto">
        <Link href="/" className="flex-1 bg-white rounded-2xl py-3 flex items-center justify-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black">戻る</span>
        </Link>
        <Link href={groupCode ? `/groups/${groupCode}/area` : '/'} className="flex-1 bg-white rounded-2xl py-3 flex items-center justify-center active:scale-95 transition-all">
          <span className="text-[#389E95] font-black">診断スタート</span>
        </Link>
      </div>

      {/* ✨ 下部の白い背景：控えめでなだらかな逆カーブ */}
      <div className="fixed bottom-0 left-0 w-full h-44 z-0 pointer-events-none">
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          className="w-full h-full filter drop-shadow-[0_-8px_15px_rgba(0,0,0,0.04)]"
        >
          <path 
            d="M0,0 Q50,35 100,0 V100 H0 Z" 
            fill="white" 
          />
        </svg>
      </div>

    </main>
  );
}