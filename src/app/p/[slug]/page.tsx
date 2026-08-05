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
      // Check if project exists via metadata API
      let projectExists = false;
      try {
        const metaRes = await fetch(`/api/projects?slug=${slug}`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta[0]) {
            projectExists = true;
            setProjectName(meta[0].name);
            // If PUBLIC and project exists, skip assets check entirely
            if (meta[0].visibility === 'PUBLIC') {
              setState('preview');
              return;
            }
          }
        }
      } catch {
        // ignore
      }

      // For non-public projects, check asset access (password etc)
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
        if (projectExists) {
          setState('preview');
        } else {
          setState('error');
          setError('Project not found or deleted');
        }
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

  if (typeof window !== 'undefined') {
    window.location.replace(`/api/proxy/${slug}${version ? `?v=${version}` : ''}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}
