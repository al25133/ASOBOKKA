import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">開発用ナビゲーション（ホーム画面）</h1>
      
      <div className="flex flex-col gap-4 max-w-md">
        <Link href="/" className="p-3 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
          トップ画面 ( / )
        </Link>
        <Link href="/register" className="p-3 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
          新規登録画面 ( /register )
        </Link>
        <Link href="/login" className="p-3 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
          ログイン画面 ( /login )
        </Link>
        <Link href="/groups/create" className="p-3 bg-blue-100 rounded hover:bg-blue-200 transition-colors">
          グループ作成画面 ( /groups/create )
        </Link>
        <Link href="/groups/search" className="p-3 bg-blue-100 rounded hover:bg-blue-200 transition-colors">
          グループ検索画面 ( /groups/search )
        </Link>
        
        {/* 動的ルートのテスト用に、仮の合言葉「12345」を入れています */}
        <Link href="/groups/12345" className="p-3 bg-green-100 rounded hover:bg-green-200 transition-colors">
          グループルーム画面 [仮:12345] ( /groups/12345 )
        </Link>
        <Link href="/groups/12345/result" className="p-3 bg-green-100 rounded hover:bg-green-200 transition-colors">
          結果画面 [仮:12345] ( /groups/12345/result )
        </Link>
      </div>
    </div>
  );
}