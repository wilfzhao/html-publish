'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Upload, Link as LinkIcon, MessageSquare, Lock, Zap, Clock, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_2px_8px_rgba(79,70,229,0.4)]">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">ProtoHost</span>
        </div>
        <a href="/dashboard">
          <button className="btn-primary">
            Go to Dashboard
          </button>
        </a>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-8 border border-indigo-100">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Built for PM teams
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.08] mb-8">
            Ship HTML prototypes
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-400 bg-clip-text text-transparent">
              in seconds
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 leading-relaxed mb-12 max-w-2xl mx-auto">
            Upload, deploy, and collaborate on prototypes — no servers needed.
            Drag &amp; drop your HTML, get an instant shareable link.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/dashboard">
              <button className="btn-primary text-base px-8 py-3.5">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </a>
            <a href="#features">
              <button className="btn-secondary text-base px-8 py-3.5">
                Learn More
              </button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Instant deploy
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500" />
              Secure sharing
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Version control
            </span>
          </div>
        </div>

        {/* Feature grid */}
        <div id="features" className="grid md:grid-cols-3 gap-6 mt-28 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Upload className="w-5 h-5 text-white" />}
            iconBg="bg-gradient-to-br from-indigo-500 to-indigo-700"
            title="Drag & Drop Upload"
            desc="Drop HTML, ZIP, or folders. Auto-deploy in seconds with instant preview links. No configuration needed."
          />
          <FeatureCard
            icon={<LinkIcon className="w-5 h-5 text-white" />}
            iconBg="bg-gradient-to-br from-purple-500 to-purple-700"
            title="Version Control"
            desc="Every upload creates a new version. Roll back anytime, share stable links that never break."
          />
          <FeatureCard
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-700"
            title="Team Collaboration"
            desc="Set access permissions, password protect, set expiry. Keep prototypes secure and trackable."
          />
        </div>

        {/* How it works */}
        <div className="mt-32 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create a Project', desc: 'Give it a name and set your visibility preferences.' },
              { step: '02', title: 'Drag & Drop', desc: 'Drop your HTML files, ZIP, or entire folders.' },
              { step: '03', title: 'Share & Collaborate', desc: 'Get a link instantly. Share with your team or the world.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold text-indigo-100 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enterprise Security</h2>
              <p className="text-gray-500">Built-in sandbox isolation for every prototype</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">iframe Sandboxing</div>
                  <div className="text-xs text-gray-500 leading-relaxed">Isolated execution environment prevents any prototype from accessing platform cookies</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Content Security Policy</div>
                  <div className="text-xs text-gray-500 leading-relaxed">Strict CSP headers prevent unauthorized external resource loading</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Expiring Links</div>
                  <div className="text-xs text-gray-500 leading-relaxed">Set expiry dates on share links to keep your prototypes under control</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-32">
          <div className="rounded-3xl p-12 md:p-16 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-indigo-200 text-lg mb-8 max-w-lg mx-auto">
                Upload your first prototype and share it with your team in under 30 seconds.
              </p>
              <a href="/dashboard">
                <button className="bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2 text-base shadow-lg">
                  Start Now — It&apos;s Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pb-8 text-center text-sm text-gray-400">
          © 2026 ProtoHost
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  desc,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="card card-hover p-8 text-left">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-5 shadow-sm`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
