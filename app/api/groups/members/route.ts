import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type GroupMemberRow = {
  user_id: string;
  selected_area: string | null;
  selected_purpose: string | null;
  selected_value: string | null;
  is_ready: boolean;
};

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

  const body = (await request.json().catch(() => null)) as { groupId?: string } | null;
  const groupId = body?.groupId?.trim();

  if (!groupId) {
    return NextResponse.json({ message: 'groupId が不足しています。' }, { status: 400 });
  }

  const authClient = createClient(url, publishableKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ message: 'ユーザー認証に失敗しました。' }, { status: 401 });
  }

  const userScopedClient = createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: memberRows, error: memberError } = await userScopedClient
    .from('group_members')
    .select('user_id, selected_area, selected_purpose, selected_value, is_ready')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (memberError) {
    return NextResponse.json({ message: memberError.message }, { status: 403 });
  }

  const members = (memberRows ?? []) as GroupMemberRow[];
  const isMember = members.some((member) => member.user_id === authData.user.id);

  if (!isMember) {
    return NextResponse.json({ message: 'このグループへのアクセス権限がありません。' }, { status: 403 });
  }

  const adminClient = createClient(url, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const profileEntries = await Promise.all(
    members.map(async (member) => {
      const { data } = await adminClient.auth.admin.getUserById(member.user_id);
      const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      const nickname = typeof metadata.nickname === 'string' && metadata.nickname.trim()
        ? metadata.nickname.trim()
        : `メンバー ${member.user_id.slice(0, 4)}`;

      const rawAvatar = metadata.avatar ?? metadata.icon;
      const avatar =
        typeof rawAvatar === 'number'
          ? String(rawAvatar)
          : typeof rawAvatar === 'string' && /^\d+$/.test(rawAvatar)
            ? rawAvatar
            : '1';

      return {
        ...member,
        nickname,
        avatar,
      };
    }),
  );

  return NextResponse.json({ members: profileEntries });
}