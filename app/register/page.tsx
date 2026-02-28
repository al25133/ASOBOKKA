"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function Register() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const avatars = Array.from({ length: 10 }, (_, i) => i + 1);
  const canSubmit = Boolean(email.trim() && password && nickname.trim() && selectedAvatar);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        router.replace('/');
        return;
      }

      setAuthChecking(false);
    };

    void checkAuth();
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvatar) {
      setMessage("アイコンを選択してください。");
      return;
    }

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setMessage('ニックネームを入力してください。');
      return;
    }

    const supabase = getSupabaseClient();
    setLoading(true);
    setMessage(null);

    const emailRedirectTo = `${window.location.origin}/login`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: {
          nickname: trimmedNickname,
          icon: selectedAvatar,
          avatar: selectedAvatar,
        },
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    setLoading(false);
    if (!data.session) {
      setMessage('登録が完了しました。ログイン画面からログインしてください。');
      return;
    }
    router.push('/');
  };

  if (authChecking) {
    return <main className="min-h-screen bg-[#D6F8C2]" />;
  }

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
      
      {/* 上部ロゴエリア */}
      <div className="pt-12 pb-8">
        <Link href="/" className="active:scale-95 transition-transform inline-block">
          <Image 
            src="/loginlogo.svg" 
            alt="あそぼっか ロゴ" 
            width={180} 
            height={90} 
            priority
            className="object-contain"
          />
        </Link>
      </div>

      {/* 新規登録カード */}
      <div className="w-full max-w-112.5 bg-white rounded-t-[60px] grow px-10 pt-12 pb-12 shadow-2xl">
        <h2 className="text-[#5A7C55] text-center text-2xl font-bold mb-10">新規会員登録</h2>

        <form onSubmit={handleRegister} className="space-y-8">
          {/* ...ログインID、パスワード、ニックネーム入力欄（変更なし）... */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">ログインID</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス（半角英数字）" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">パスワード(6文字以上)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="半角英数字" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">ニックネーム</label>
            <input type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]" />
          </div>

          {/* 🐧 アイコン選択エリア：最初からフルカラー！ */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">アイコン</label>
            <div className="border border-gray-200 rounded-[30px] p-5 grid grid-cols-5 gap-4 bg-[#F9FBF9]">
              {avatars.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedAvatar(num)}
                  // ボタン側の設定：未選択時の透明度を opacity-70 に上げて見やすくしました
                  className={`relative aspect-square rounded-full transition-all duration-200 ease-out
                    ${selectedAvatar === num 
                      ? 'border-4 border-[#52A399] scale-110 z-10 bg-[#E9F6E5] shadow-md opacity-100' 
                      : 'border-2 border-transparent opacity-70 hover:opacity-100 hover:scale-[1.4] hover:z-50 hover:shadow-2xl'
                    }`}
                >
                  <Image 
                    src={`/avatars/avatar${num}.svg`} 
                    alt={`Avatar ${num}`} 
                    fill 
                    // 画像側の設定：grayscale を完全に削除しました。常にフルカラーです。
                    className="p-1 object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <button type="submit" disabled={loading || !canSubmit} className="bg-[#52A399] text-white font-bold py-4 px-12 rounded-2xl shadow-lg active:scale-95 transition-all text-lg flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? '登録中...' : '会員登録する'} <span className="text-xl">≫</span>
            </button>
          </div>
          {message ? <p className="text-center text-sm text-red-600">{message}</p> : null}

          <p className="text-center text-sm text-[#6D8D69]">
            登録済みの方は <Link href="/login" className="underline font-semibold">ログイン</Link>
          </p>
        </form>
      </div>
    </main>
  );
}