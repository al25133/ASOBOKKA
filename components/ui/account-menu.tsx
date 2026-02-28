"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

interface AccountMenuProps {
  avatarId: string;
}

const menuItems = [
  { href: '/account/settings', label: 'アカウント設定' },
  { href: '/account/settings#icon', label: 'アイコン変更' },
  { href: '/account/settings#nickname', label: 'ニックネーム変更' },
  { href: '/account/settings#email', label: 'メールアドレス変更' },
  { href: '/account/settings#password', label: 'パスワード変更' },
  { href: '/account/settings#delete', label: 'アカウント削除' },
];

export function AccountMenu({ avatarId }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    setLoggingOut(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);
    setOpen(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push('/login');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="rounded-full p-0.5 active:scale-95 transition-transform"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="アカウント設定を開く"
      >
        <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm">
          <Image src={`/avatars/avatar${avatarId}.svg`} alt="マイアイコン" width={36} height={36} />
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#389E95]/20 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 text-sm font-bold text-[#5A7C55] border-b border-[#389E95]/10">アカウント設定</div>
          <nav className="py-1" aria-label="アカウント設定メニュー">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-[#5A5A5A] hover:bg-[#F0FAED] transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="w-full text-left px-4 py-2.5 text-sm text-[#B94A48] hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {loggingOut ? 'ログアウト中...' : 'ログアウト'}
            </button>
          </nav>
          {message ? <p className="px-4 pb-3 text-xs text-red-600">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}