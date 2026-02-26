"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

type MessageType = 'success' | 'error';

const avatars = Array.from({ length: 10 }, (_, i) => i + 1);

export default function AccountSettingsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [userMetadata, setUserMetadata] = useState<Record<string, unknown>>({});

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>('success');

  const canDelete = useMemo(() => confirmDeleteText === 'DELETE', [confirmDeleteText]);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace('/login');
        return;
      }

      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      setUserMetadata(metadata);

      const savedNickname = metadata.nickname;
      if (typeof savedNickname === 'string') {
        setNickname(savedNickname);
      }

      const savedAvatar = metadata.avatar ?? metadata.icon;
      if (typeof savedAvatar === 'number') {
        setSelectedAvatar(savedAvatar);
      } else if (typeof savedAvatar === 'string' && /^\d+$/.test(savedAvatar)) {
        setSelectedAvatar(Number(savedAvatar));
      }

      const currentEmail = data.user.email ?? '';
      setEmail(currentEmail);
      setNewEmail(currentEmail);
      setAuthChecking(false);
    };

    void loadUser();
  }, [router]);

  const showError = (nextMessage: string) => {
    setMessageType('error');
    setMessage(nextMessage);
  };

  const showSuccess = (nextMessage: string) => {
    setMessageType('success');
    setMessage(nextMessage);
  };

  const updateProfile = async () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      showError('ニックネームを入力してください。');
      return;
    }

    const supabase = getSupabaseClient();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: {
        ...userMetadata,
        nickname: trimmedNickname,
        avatar: selectedAvatar,
        icon: selectedAvatar,
      },
    });

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    setUserMetadata((prev) => ({
      ...prev,
      nickname: trimmedNickname,
      avatar: selectedAvatar,
      icon: selectedAvatar,
    }));
    showSuccess('アイコンとニックネームを更新しました。');
  };

  const updateEmail = async () => {
    const normalized = newEmail.trim();
    if (!normalized) {
      showError('メールアドレスを入力してください。');
      return;
    }

    const supabase = getSupabaseClient();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ email: normalized });

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    setEmail(normalized);
    showSuccess('メールアドレス変更を受け付けました。確認メールを確認してください。');
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      showError('パスワードは6文字以上で入力してください。');
      return;
    }

    const supabase = getSupabaseClient();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    setNewPassword('');
    showSuccess('パスワードを変更しました。');
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    router.push('/login');
  };

  const deleteAccount = async () => {
    if (!canDelete) {
      showError('削除するには DELETE と入力してください。');
      return;
    }

    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      showError('セッションが確認できませんでした。再ログインしてください。');
      return;
    }

    setDeleting(true);
    setMessage(null);

    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setDeleting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      showError(result?.message ?? 'アカウント削除に失敗しました。');
      return;
    }

    await supabase.auth.signOut();
    router.push('/register');
  };

  if (authChecking) {
    return <main className="min-h-screen bg-[#D6F8C2]" />;
  }

  return (
    <main className="min-h-screen bg-[#D6F8C2] flex flex-col items-center font-sans overflow-x-hidden">
      <div className="pt-8 pb-5">
        <Link href="/groups" className="active:scale-95 transition-transform inline-block">
          <Image src="/loginlogo.svg" alt="あそぼっか ロゴ" width={150} height={75} priority className="object-contain" />
        </Link>
      </div>

      <div className="w-full max-w-112.5 bg-white rounded-t-[60px] grow px-8 pt-10 pb-16 shadow-2xl">
        <h1 className="text-[#5A7C55] text-center text-2xl font-bold mb-2">アカウント設定</h1>
        <p className="text-center text-sm text-[#6D8D69] mb-8">メール: {email}</p>

        <div className="space-y-7">
          <section id="icon" className="space-y-3">
            <h2 className="text-sm font-bold text-[#5A7C55] ml-2">アイコン変更</h2>
            <div className="border border-gray-200 rounded-[30px] p-5 grid grid-cols-5 gap-4 bg-[#F9FBF9]">
              {avatars.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedAvatar(num)}
                  className={`relative aspect-square rounded-full transition-all duration-200 ease-out ${
                    selectedAvatar === num
                      ? 'border-4 border-[#52A399] scale-110 z-10 bg-[#E9F6E5] shadow-md opacity-100'
                      : 'border-2 border-transparent opacity-70 hover:opacity-100 hover:scale-[1.15] hover:z-30 hover:shadow-lg'
                  }`}
                >
                  <Image src={`/avatars/avatar${num}.svg`} alt={`Avatar ${num}`} fill className="p-1 object-contain" />
                </button>
              ))}
            </div>
          </section>

          <section id="nickname" className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">ニックネーム変更</label>
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]"
            />
          </section>

          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => void updateProfile()}
              disabled={loading}
              className="bg-[#52A399] text-white font-bold py-3.5 px-10 rounded-2xl shadow-lg active:scale-95 transition-all text-base disabled:opacity-70"
            >
              {loading ? '更新中...' : 'アイコン・ニックネームを保存'}
            </button>
          </div>

          <section id="email" className="space-y-2 pt-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">メールアドレス変更</label>
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]"
            />
            <div className="pt-1">
              <button
                type="button"
                onClick={() => void updateEmail()}
                disabled={loading}
                className="w-full bg-white border-2 border-[#52A399]/40 text-[#389E95] font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-70"
              >
                メールアドレスを変更
              </button>
            </div>
          </section>

          <section id="password" className="space-y-2">
            <label className="text-sm font-bold text-[#5A7C55] ml-2">パスワード変更</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="新しいパスワード（6文字以上）"
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-[#52A399] bg-[#F9FBF9]"
            />
            <div className="pt-1">
              <button
                type="button"
                onClick={() => void updatePassword()}
                disabled={loading}
                className="w-full bg-white border-2 border-[#52A399]/40 text-[#389E95] font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-70"
              >
                パスワードを変更
              </button>
            </div>
          </section>

          <section className="pt-2">
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loading}
              className="w-full bg-[#F0FAED] border border-[#52A399]/30 text-[#389E95] font-bold py-3 rounded-2xl active:scale-95 transition-all disabled:opacity-70"
            >
              ログアウト
            </button>
          </section>

          <section id="delete" className="space-y-2 border border-red-200 rounded-2xl p-4 bg-red-50/40">
            <p className="text-sm font-bold text-[#B94A48]">アカウント削除</p>
            <p className="text-xs text-[#8E4745]">削除すると復元できません。削除する場合は DELETE と入力してください。</p>
            <input
              type="text"
              value={confirmDeleteText}
              onChange={(event) => setConfirmDeleteText(event.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-3 rounded-xl border border-red-200 outline-none text-gray-700 focus:ring-2 focus:ring-red-300 bg-white"
            />
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={deleting || !canDelete}
              className="w-full bg-[#B94A48] text-white font-bold py-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {deleting ? '削除中...' : 'アカウントを削除する'}
            </button>
          </section>

          {message ? (
            <p className={`text-center text-sm ${messageType === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}