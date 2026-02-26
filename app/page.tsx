"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [showUI, setShowUI] = useState(false);
  // 1. 変数名を email に統一してエラーを解決します
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUI(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 2. 変数名が email になったので、ここで正しくチェックできるようになります
    if (email && password) {
      router.push('/groups'); 
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#D6F8C2] flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* 🐧 Phase 1: Frame 55.svg */}
      <div className={`absolute inset-0 z-50 transition-opacity duration-1000 flex items-center justify-center bg-[#D6F8C2] ${showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="relative w-full h-full max-w-100 aspect-402/874">
          <Image 
            src="/Frame 55.svg" 
            alt="イントロ" 
            fill 
            priority 
            className="object-contain" 
          />
        </div>
      </div>

      {/* ✨ Phase 2: loginlogo.svg と ログインUI */}
      <div className={`relative z-10 w-full flex flex-col items-center pt-20 px-8 transition-opacity duration-1000 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        
        <div className="relative w-64 h-32 mb-10">
          <Image 
            src="/loginlogo.svg" 
            alt="ロゴ" 
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* 3. Tailwindのアドバイスに従い max-w-85 を適用しました */}
        <div className="w-full max-w-85 bg-[#E9F6E5] rounded-[40px] p-8 shadow-sm border border-white/20 mb-8">
          <p className="text-[#5A7C55] text-center text-xs font-bold mb-6 opacity-60 italic">おかえりなさい！</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] ml-2 font-bold text-[#5A7C55] opacity-70">ログインID</label>
              <input 
                type="text"
                value={email} // loginId から email に変更
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス（半角英数字）"
                className="w-full px-5 py-3.5 rounded-2xl border-none outline-none shadow-inner bg-white text-gray-700 placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] ml-2 font-bold text-[#5A7C55] opacity-70">パスワード</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="半角英数字"
                className="w-full px-5 py-3.5 rounded-2xl border-none outline-none shadow-inner bg-white text-gray-700 placeholder:text-gray-300"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#52A399] text-white font-bold py-4 rounded-full shadow-md active:scale-95 transition-transform text-lg mt-4"
            >
              ログイン
            </button>
          </form>
        </div>

        <div className="w-full max-w-85">
          <div className="flex items-center w-full mb-8 px-2">
            <div className="grow border-t border-[#52A399]/30"></div>
            <span className="px-4 text-[10px] font-bold text-[#52A399] shrink-0">初めてご利用の方はこちら</span>
            <div className="grow border-t border-[#52A399]/30"></div>
          </div>

          <button 
            onClick={() => router.push('/register')}
            className="w-full bg-[#52A399] text-white font-bold py-4 rounded-full shadow-md active:scale-95 transition-transform text-lg"
          >
            新規会員登録
          </button>
        </div>
      </div>
    </main>
  );
}