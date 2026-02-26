import Link from "next/link";
import { Header } from "@/components/ui/header";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-6">
      <Header title="ASOBOKKA" description="まずはログインまたは新規登録してください。" />
      <div className="space-y-3">
        <Link href="/login" className="block rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50">
          ログイン
        </Link>
        <Link href="/register" className="block rounded-2xl border border-zinc-200 p-4 hover:bg-zinc-50">
          新規登録
        </Link>
      </div>
    </main>
  );
}