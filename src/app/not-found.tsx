import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 text-center">
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/70 blur-3xl" />
      <section className="relative max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/80 bg-white shadow-[0_16px_50px_rgba(79,70,229,0.12)]">
          <Image
            src="/assets/brand/youchao-mark.svg"
            alt="有巢"
            width={48}
            height={48}
            priority
          />
        </div>
        <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-indigo-500">似乎走错巢了</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">这里还没有原型 👀</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          请检查链接是否完整，或者请分享者重新发你一次。
          <br />
          好点子可能只是藏在另一个地址里。
        </p>
      </section>
    </main>
  );
}
