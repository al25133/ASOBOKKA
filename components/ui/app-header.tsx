import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TopLogoBarProps {
  rightSlot?: ReactNode;
  className?: string;
}

interface HomeHeaderBarProps {
  rightSlot: ReactNode;
}

export function TopLogoBar({ rightSlot, className = '' }: TopLogoBarProps) {
  return (
    <div className={`relative z-20 flex justify-center py-4 w-full ${className}`.trim()}>
      <Link href="/" className="active:scale-95 transition-transform">
        <Image src="/loginlogo.svg" alt="ロゴ" width={100} height={50} className="object-contain" />
      </Link>
      {rightSlot ? <div className="absolute right-6 top-1/2 -translate-y-1/2">{rightSlot}</div> : null}
    </div>
  );
}

export function HomeHeaderBar({ rightSlot }: HomeHeaderBarProps) {
  return (
    <header className="relative z-20 w-full flex items-center justify-between px-6 py-2 bg-[#389E95] border-y-2 border-[#2d7d76]">
      <Link href="/" className="active:scale-90 transition-transform">
        <Image src="/homelogo.svg" alt="ホーム" width={32} height={32} />
      </Link>
      {rightSlot}
    </header>
  );
}
