import { HomeGroupEntry } from "./_components/group-entry";
import { GoogleLoginButton } from "./_components/google-login-button";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-12 sm:px-8">
        <header className="border-b border-gray-100 pb-8">
          <p className="text-xl font-medium tracking-tight text-gray-800">Seasoning</p>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16 gap-16">
          <div className="space-y-6">
            <p className="text-xs font-medium tracking-widest text-gray-500 uppercase">
              非同期型等価交換日記
            </p>
            <h1 className="text-3xl font-medium leading-tight text-gray-800 sm:text-4xl tracking-tight">
              書いた人から、<br className="hidden sm:block" />
              誰かの日記が届く。
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-gray-800 font-normal">
              Seasoningは、同じグループの中で日記を非同期に交換するための場所です。読むだけの人が増えすぎないように、投稿と受信をゆるやかに釣り合わせます。
            </p>
          </div>

          <section className="flex flex-wrap items-center gap-x-8 gap-y-4 pb-8 mb-8 border-b border-gray-100">
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-medium text-gray-800 tracking-widest uppercase">Write</p>
              <p className="text-sm font-medium text-gray-800">
                50文字以上で投稿
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-medium text-gray-800 tracking-widest uppercase">Ticket</p>
              <p className="text-sm font-medium text-gray-800">
                届く日記がない時は待機
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-medium text-gray-800 tracking-widest uppercase">Read</p>
              <p className="text-sm font-medium text-gray-800">
                分配された日記だけ読む
              </p>
            </div>
          </section>

          <div className="flex flex-col items-center gap-4">
            <GoogleLoginButton />
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 border-t border-gray-100"></div>
              <p className="text-xs text-gray-400">または</p>
              <div className="flex-1 border-t border-gray-100"></div>
            </div>
          </div>

          <div>
            <HomeGroupEntry />
          </div>
        </section>
      </div>
    </main>
  );
}
