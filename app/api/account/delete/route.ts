import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !publishableKey || !adminKey) {
    return NextResponse.json(
      { message: 'サーバー設定が不足しています。SUPABASE_SECRET_KEY を設定してください。' },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ message: '認証トークンが見つかりません。' }, { status: 401 });
  }

  const authClient = createClient(url, publishableKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ message: 'ユーザー認証に失敗しました。' }, { status: 401 });
  }

  const adminClient = createClient(url, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id, true);

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}