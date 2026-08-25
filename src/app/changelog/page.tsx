import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Rocket,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { changelog, type ChangelogCategory } from '@/lib/changelog';

const categoryMeta: Record<ChangelogCategory, {
  label: string;
  icon: typeof Sparkles;
  badge: string;
  iconStyle: string;
}> = {
  new: {
    label: '新增',
    icon: Sparkles,
    badge: 'bg-indigo-50 text-indigo-700',
    iconStyle: 'bg-indigo-100 text-indigo-600',
  },
  improved: {
    label: '优化',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700',
    iconStyle: 'bg-emerald-100 text-emerald-600',
  },
  fixed: {
    label: '修复',
    icon: Wrench,
    badge: 'bg-amber-50 text-amber-700',
    iconStyle: 'bg-amber-100 text-amber-600',
  },
};

export default function ChangelogPage() {
  return (
    <AppShell>
      <div className="min-h-full bg-gray-50">
        <header className="border-b border-gray-100 bg-white px-6 py-7 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
              返回 Dashboard
            </Link>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">有巢发布日志</h1>
                <p className="mt-1.5 text-sm text-gray-500">了解每个版本新增了什么、优化了什么，以及修复了哪些问题。</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="relative">
            <div className="absolute bottom-0 left-[19px] top-5 hidden w-px bg-indigo-100 sm:block" aria-hidden="true" />

            <div className="space-y-7">
              {changelog.map((release, index) => (
                <article key={release.version} id={`v${release.version}`} className="relative scroll-mt-8 sm:pl-16">
                  <div className={`absolute left-0 top-5 hidden h-10 w-10 items-center justify-center rounded-full border-4 border-gray-50 sm:flex ${
                    index === 0 ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-500 ring-1 ring-indigo-100'
                  }`}>
                    <Rocket className="h-4 w-4" />
                  </div>

                  <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    index === 0 ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-gray-100'
                  }`}>
                    <div className="border-b border-gray-100 px-6 py-5 lg:px-7">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-lg bg-gray-900 px-2.5 py-1 font-mono text-sm font-semibold text-white">v{release.version}</span>
                        {index === 0 && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">最新版本</span>
                        )}
                        <time className="text-xs text-gray-400" dateTime={release.date}>{release.date}</time>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-gray-900">{release.title}</h2>
                      <p className="mt-1.5 text-sm leading-6 text-gray-500">{release.summary}</p>
                    </div>

                    <div className="space-y-6 px-6 py-6 lg:px-7">
                      {release.sections.map((section) => {
                        const meta = categoryMeta[section.category];
                        const Icon = meta.icon;
                        return (
                          <section key={section.category} className="grid gap-3 sm:grid-cols-[86px_minmax(0,1fr)]">
                            <div>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {meta.label}
                              </span>
                            </div>
                            <ul className="space-y-2.5">
                              {section.items.map((item) => (
                                <li key={item} className="flex gap-2.5 text-sm leading-6 text-gray-600">
                                  <span className={`mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.iconStyle}`} />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
