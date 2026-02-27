"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AccountMenu, HeaderHamburger } from '@/components/ui/account-menu';
import { HomeHeaderBar, TopLogoBar } from '@/components/ui/app-header';
import { FootprintsStage } from '@/components/ui/decorative-layout';

function SplashPageContent() {
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
      <TopLogoBar rightSlot={<HeaderHamburger colorClassName="bg-[#389E95]" />} className="bg-[#D6F8C2]" />

      <HomeHeaderBar rightSlot={<AccountMenu avatarId={avatarId} />} />

      <FootprintsStage>
        <div className="flex items-center justify-center h-full">
          <Image src="/loginlogo.svg" alt="あそぼっか ロゴ" width={280} height={140} priority className="object-contain" />
        </div>
      </FootprintsStage>
    </main>
  );
}

export default function SplashPage() {
  return (
    <Suspense fallback={null}>
      <SplashPageContent />
    </Suspense>
  );
}