'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Shield, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PublicPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const version = searchParams.get('v');
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'gate' | 'preview' | 'error'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Try fetching project metadata first
      try {
        const metaRes = await fetch(`/api/projects?slug=${slug}`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta[0]) {
            setProjectName(meta[0].name);
          }
        }
      } catch {
        // ignore
      }

      const paramsStr = new URLSearchParams();
      if (version) paramsStr.set('v', version);

      const res = await fetch(`/api/assets/${slug}?${paramsStr}`);

      if (res.status === 401) {
        setState('gate');
        setError('Password required');
      } else if (res.status === 403) {
        setState('error');
        setError('Access denied for this prototype');
      } else if (res.status === 410) {
        setState('error');
        setError('This link has expired');
      } else if (res.status === 404) {
        setState('error');
        setError('Project not found or deleted');
      } else if (res.ok) {
        setState('preview');
      }
    } catch {
      setState('error');
      setError('Failed to load prototype');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paramsStr = new URLSearchParams();
      if (version) paramsStr.set('v', version);
      paramsStr.set('password', password);

      const res = await fetch(`/api/assets/${slug}?${paramsStr}`);
      if (res.ok) {
        setState('preview');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Network error');
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading prototype...</p>
        </div>
      </div>
    );
  }

  if (state === 'gate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="card p-8 max-w-md w-full mx-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 mx-auto">
            <Shield className="w-7 h-7 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Password Protected</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {projectName ? `"${projectName}" requires a password` : 'This prototype is protected'}
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(e)}
            />
            {error && <p className="text-sm text-rose-500 text-center">{error}</p>}
            <button type="submit" className="w-full btn-primary text-base">
              Unlock
            </button>
          </form>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 btn-secondary text-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="card p-8 max-w-md w-full mx-4 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-5 mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <div className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">{projectName || 'Prototype'}</span>
        </div>
        <a
          href={`/api/assets/${slug}${version ? `?v=${version}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          New Tab
        </a>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 bg-gray-100 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="bg-white shadow-lg w-full h-full max-w-5xl rounded-xl overflow-hidden">
            <iframe
              src={`/api/assets/${slug}${version ? `?v=${version}` : ''}`}
              className="w-full h-full border-0"
              title="Prototype Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{ minHeight: 'calc(100vh - 60px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
