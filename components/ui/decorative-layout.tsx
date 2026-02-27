import type { ReactNode } from 'react';
import Image from 'next/image';

interface FootprintsStageProps {
  children: ReactNode;
  className?: string;
}

interface BottomCurveBackgroundProps {
  className?: string;
}

export function FootprintsStage({ children, className = '' }: FootprintsStageProps) {
  return (
    <div className={`relative z-10 w-100 h-172.75 flex flex-col items-center justify-center ${className}`.trim()}>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute bottom-95 -right-10 w-80 h-80 opacity-30">
          <Image src="/足跡右上.svg" alt="" fill className="object-contain" />
        </div>
        <div className="absolute top-87.5 -left-12 w-85 h-85 opacity-30">
          <Image src="/足跡左下.svg" alt="" fill className="object-contain" />
        </div>
      </div>

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}

export function BottomCurveBackground({ className = '' }: BottomCurveBackgroundProps) {
  return <div className={`fixed bottom-0 left-0 w-full bg-white z-0 pointer-events-none ${className}`.trim()} />;
}
