import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Eye,
  FolderPlus,
  History,
  Lightbulb,
  Settings,
  Upload,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';

const sections = [
  { id: 'create', label: '创建项目', icon: FolderPlus },
  { id: 'upload', label: '上传原型', icon: Upload },
  { id: 'codex', label: '通过 Codex 发布', icon: Bot },
  { id: 'preview', label: '预览和分享', icon: Eye },
  { id: 'versions', label: '版本管理', icon: History },
  { id: 'settings', label: '项目设置', icon: Settings },
];

function GuideImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={1440}
        height={900}
        className="h-auto w-full"
        sizes="(max-width: 1024px) 100vw, 860px"
      />
    </div>
  );
}

function StepList({ children }: { children: React.ReactNode }) {
  return <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-gray-600">{children}</ol>;
}

export default function HelpPage() {
  return (
    <AppShell>
      <div className="min-h-full bg-gray-50">
        <header className="border-b border-gray-100 bg-white px-6 py-7 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
              返回 Dashboard
            </Link>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">有巢使用帮助</h1>
                <p className="mt-1.5 text-sm text-gray-500">从上传原型到分享评审，几分钟快速上手。</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-10">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
              <div className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">本页目录</div>
              <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <section.icon className="h-4 w-4 flex-shrink-0" />
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            <section id="create" className="scroll-mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">1</span>
                <h2 className="text-lg font-semibold text-gray-900">创建项目</h2>
              </div>
              <StepList>
                <li>进入 Dashboard，点击右上角 <strong className="text-gray-800">New Project</strong>。</li>
                <li>填写项目名称和说明，并选择公开访问或密码保护。</li>
                <li>点击继续，进入上传页面。</li>
              </StepList>
              <GuideImage src="/images/help/create-project.png" alt="在 Dashboard 创建有巢项目" />
            </section>

            <section id="upload" className="scroll-mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">2</span>
                <h2 className="text-lg font-semibold text-gray-900">在网页中上传原型</h2>
              </div>
              <StepList>
                <li>拖入一个 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">.html</code> 文件，或点击上传区域选择文件。</li>
                <li>填写版本说明；如有需要，再填写版本号。</li>
                <li>点击 <strong className="text-gray-800">Upload &amp; Deploy</strong> 完成发布。</li>
              </StepList>
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                如果原型包含独立图片、样式或脚本文件，推荐使用下方的 Codex 发布方式。
              </div>
              <GuideImage src="/images/help/upload-prototype.png" alt="上传 HTML 原型文件" />
            </section>

            <section id="codex" className="scroll-mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">3</span>
                <h2 className="text-lg font-semibold text-gray-900">通过 Codex 技能发布</h2>
              </div>
              <StepList>
                <li>打开目标项目的 <strong className="text-gray-800">Settings → AI Publish</strong>。</li>
                <li>按页面提示安装 CLI 和发布技能；首次使用时完成浏览器授权。</li>
                <li>在 Codex 中告诉它：“把当前原型发布到「项目名称」，备注「本次修改说明」”。</li>
              </StepList>
              <GuideImage src="/images/help/codex-publish.png" alt="通过 Codex 技能发布完整原型" />
            </section>

            <section id="preview" className="scroll-mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">4</span>
                <h2 className="text-lg font-semibold text-gray-900">预览和分享</h2>
              </div>
              <StepList>
                <li>进入项目的 <strong className="text-gray-800">Preview</strong> 页面。</li>
                <li>切换电脑、平板或手机尺寸检查原型效果。</li>
                <li>点击复制按钮分享链接，或点击 <strong className="text-gray-800">Open</strong> 在新窗口打开。</li>
              </StepList>
              <GuideImage src="/images/help/preview-share.png" alt="预览并分享有巢原型" />
            </section>

            <section id="versions" className="scroll-mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">5</span>
                <h2 className="text-lg font-semibold text-gray-900">管理历史版本</h2>
              </div>
              <StepList>
                <li>在 <strong className="text-gray-800">Versions</strong> 中查看所有历史版本。</li>
                <li>使用版本右侧按钮预览、复制链接、回滚或删除。</li>
                <li>带有 <strong className="text-emerald-600">CURRENT</strong> 标记的是当前对外展示版本。</li>
              </StepList>
              <GuideImage src="/images/help/version-management.png" alt="查看和管理历史版本" />
            </section>

            <section id="settings" className="scroll-mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">6</span>
                <h2 className="text-lg font-semibold text-gray-900">修改项目设置</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-gray-600">
                在 <strong className="text-gray-800">Settings</strong> 中可以修改项目名称、说明、访问地址、公开方式和密码。页面底部可删除整个项目，请谨慎操作。
              </p>
              <GuideImage src="/images/help/project-settings.png" alt="修改有巢项目设置" />
            </section>

            <div className="flex items-center justify-between rounded-2xl bg-indigo-600 px-6 py-5 text-white">
              <div>
                <div className="font-semibold">准备好发布第一个原型了吗？</div>
                <div className="mt-1 text-sm text-indigo-100">返回 Dashboard，新建或打开一个项目。</div>
              </div>
              <Link href="/dashboard" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50">
                开始使用
              </Link>
            </div>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
