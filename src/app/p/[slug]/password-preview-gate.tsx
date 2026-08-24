'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, Shield } from 'lucide-react';

export default function PasswordPreviewGate({ projectSlug, projectName, version, expired = false }: {
  projectSlug: string;
  projectName: string;
  version?: string;
  expired?: boolean;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(!expired);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(expired ? 'This link has expired' : '');
  const previewUrl = `/api/proxy/${projectSlug}${version ? `?v=${encodeURIComponent(version)}` : ''}`;

  useEffect(() => {
    if (expired) return;
    const params = new URLSearchParams();
    if (version) params.set('v', version);
    fetch(`/api/assets/${projectSlug}?${params}`).then((response) => {
      if (response.ok) window.location.replace(previewUrl);
      else setChecking(false);
    }).catch(() => {
      setChecking(false);
      setError('Failed to load prototype');
    });
  }, [expired, previewUrl, projectSlug, version]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch(`/api/public/projects/${projectSlug}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (!response?.ok) {
      setError('Invalid password');
      return;
    }
    window.location.replace(previewUrl);
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50"><div className="text-center"><Eye className="w-8 h-8 text-indigo-600 mx-auto mb-3" /><p className="text-sm text-gray-500">Loading prototype...</p></div></div>;
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="card p-8 max-w-md w-full mx-4 text-center shadow-xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="card p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 mx-auto"><Shield className="w-7 h-7 text-indigo-500" /></div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">Password Protected</h1>
        <p className="text-sm text-gray-500 text-center mb-6">“{projectName}” requires a password</p>
        <form onSubmit={unlock} className="space-y-4">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className="input" autoFocus />
          {error && <p className="text-sm text-rose-500 text-center">{error}</p>}
          <button type="submit" className="w-full btn-primary text-base">Unlock</button>
        </form>
      </div>
    </div>
  );
}
