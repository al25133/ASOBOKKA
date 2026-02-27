"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/ui/account-menu';

export default function SplashPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    if (authState !== 'authed') {
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (typeof window.navigator !== 'undefined' && 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

    if (!isStandalone) {
      router.replace('/');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace('/');
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [authState, router]);

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

  const avatarId = userAvatarId || searchParams.get('avatar') || '1';

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col font-sans overflow-x-hidden relative items-center">
      <div className="relative z-20 flex justify-center py-4 w-full bg-[#D6F8C2]">
        <Link href="/" className="active:scale-95 transition-transform">
          <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
        </Link>
      </div>

      <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
        <Link href="/" className="active:scale-90 transition-transform">
          <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
        </Link>
        <AccountMenu avatarId={avatarId} />
      </header>

      <div className="relative z-10 w-100 h-172.75 flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute bottom-95 -right-10 w-80 h-80 opacity-30">
            <Image src="/足跡右上.svg" alt="" fill className="object-contain" />
          </div>
          <div className="absolute top-87.5 -left-12 w-85 h-85 opacity-30">
            <Image src="/足跡左下.svg" alt="" fill className="object-contain" />
          </div>
        </div>

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <Image src="/loginlogo.svg" alt="あそぼっか ロゴ" width={280} height={140} priority className="object-contain" />
        </div>
      </div>
    </main>
  );
}