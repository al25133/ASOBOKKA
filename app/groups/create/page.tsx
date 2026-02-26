"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/ui/account-menu';

type GroupMember = {
  user_id: string;
};

export default function GroupCreate() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [avatarId, setAvatarId] = useState('1');
  const [groupCode, setGroupCode] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMembers = async (targetGroupId: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', targetGroupId)
      .order('created_at', { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data ?? []);
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

      const avatar = data.user.user_metadata?.avatar;
      if (typeof avatar === 'number' || typeof avatar === 'string') {
        setAvatarId(String(avatar));
      }

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
    if (!groupId) {
      return;
    }

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
      
      {/* 🐧 ロゴエリア */}
      <div className="relative z-20 flex justify-center py-4 w-full">
        <Link href="/" className="active:scale-95 transition-transform">
          <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
        </Link>
      </div>

      {/* 🟢 ヘッダーバー */}
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
        <Link href="/groups" className="active:scale-90 transition-transform">
          <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
        </Link>
        <AccountMenu avatarId={avatarId} />
      </header>

      {/* 🐾 メインコンテンツ */}
      <div className="relative z-10 w-full max-w-100.5 flex flex-col items-center pt-10 px-6 pb-40">
        
        {/* 💬 グループ番号の吹き出し */}
        <div className="relative w-full mb-24"> {/* mb-16から24へ広げてペンギンのスペースを確保 */}
          <div className="bg-white border-[3px] border-[#389E95] rounded-[25px] p-6 pt-5 relative z-10 shadow-sm">
            <p className="text-[#389E95] text-[10px] font-bold mb-1">グループの番号は</p>
            <p className="text-[#5A5A5A] text-center text-5xl font-bold tracking-widest my-3">{groupCode}</p>
            <p className="text-[#389E95] text-[10px] font-bold text-right">みんなに教えてね！</p>
            
            {/* ✨ しっぽの位置調整：ペンギンが下がったので、しっぽも少し下に下げました */}
            <div className="absolute top-[75%] -right-3 w-6 h-6 bg-white border-t-[3px] border-r-[3px] border-[#389E95] rotate-30 -translate-y-1/2"></div>
          </div>
          
          {/* ✨ ペンギンの位置：-bottom-16 から -bottom-28 まで大幅に下げました */}
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
          <p className="text-[#389E95] text-sm font-bold mb-2 ml-2">メンバー</p>
          <div className="bg-white rounded-[30px] p-8 min-h-70 shadow-sm border border-[#389E95]/10">
            {message ? <p className="mb-3 text-sm text-red-600">{message}</p> : null}
            <div className="grid grid-cols-3 gap-y-8 gap-x-4">
              {members.map((member) => (
                <div key={member.user_id} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full border-2 border-[#D6F8C2] overflow-hidden bg-white shadow-sm">
                    <Image src={`/avatars/avatar${avatarId}.svg`} alt="メンバー" width={56} height={56} />
                  </div>
                  <span className="text-[10px] text-[#5A5A5A] font-bold">
                    {member.user_id === userId ? 'あなた' : `メンバー ${member.user_id.slice(0, 4)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🔘 下部ナビゲーション */}
      <div className="fixed bottom-10 z-40 w-full max-w-90 bg-[#52A399] rounded-[30px] p-3 shadow-lg flex justify-between gap-3 mx-auto">
        <Link href="/groups" className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center">
          <span className="text-[#389E95] font-bold">戻る</span>
        </Link>
        <Link href={groupCode ? `/groups/${groupCode}` : '/groups'} className="flex-1 bg-white rounded-2xl py-2.5 flex items-center justify-center">
          <span className="text-[#389E95] font-bold">次へ</span>
        </Link>
      </div>

      {/* ⚪️ 下部の白い曲線背景：少し高くしてペンギンが乗るようにしました */}
      <div className="fixed bottom-0 left-0 w-full h-44 bg-white rounded-t-[140px] z-0 pointer-events-none"></div>

    </main>
  );
}