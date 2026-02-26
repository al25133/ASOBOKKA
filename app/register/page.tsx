"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const avatars = Array.from({ length: 10 }, (_, i) => i + 1);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvatar) {
      alert("アイコンを選択してください！");
      return;
    }
    // ここに登録処理を記述
    console.log("登録データ:", { email, password, nickname, selectedAvatar });
    alert("会員登録が完了しました！");
    router.push('/'); 
  };

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
      
      {/* 上部ロゴエリア */}
      <div className="pt-12 pb-8">
        <Image 
          src="/loginlogo.svg" 
          alt="あそぼっか ロゴ" 
          width={180} 
          height={90} 
          priority
          className="object-contain"
        />
      </div>

      {/* 新規登録カード */}
      <div className="w-full max-w-[450px] bg-white rounded-t-[60px] flex-grow px-10 pt-12 pb-12 shadow-2xl">
        <h2 className="text-[#5A7C55] text-center text-2xl font-bold mb-10">新規会員登録</h2>

        <form onSubmit={handleRegister} className="space-y-8">
          {/* ...ログインID、パスワード、ニックネーム入力欄（変更なし）... */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">ログインID</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス（半角英数字）" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">パスワード</label>
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
            <button type="submit" className="bg-[#52A399] text-white font-bold py-4 px-12 rounded-2xl shadow-lg active:scale-95 transition-all text-lg flex items-center gap-3">
              会員登録する <span className="text-xl">≫</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}