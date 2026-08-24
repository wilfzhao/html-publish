'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

export default function ManagementPasswordGate({ slug, projectName }: { slug: string; projectName: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const response = await fetch(`/api/public/projects/${encodeURIComponent(slug)}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);

    if (!response?.ok) {
      setError('密码不正确，请再试一次');
      setSubmitting(false);
      return;
    }
    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-5">
      <div className="card w-full max-w-sm p-8 shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <LockKeyhole className="h-7 w-7 text-indigo-500" />
        </div>
        <h1 className="text-center text-xl font-bold text-gray-900">进入项目</h1>
        <p className="mb-6 mt-2 text-center text-sm text-gray-500">“{projectName}”的管理页面需要密码</p>
        <form onSubmit={unlock} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入项目密码"
            className="input"
            autoFocus
          />
          {error && <p className="text-center text-sm text-rose-500">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting || !password}>
            {submitting ? '正在验证…' : '进入项目'}
          </button>
        </form>
      </div>
    </main>
  );
}
