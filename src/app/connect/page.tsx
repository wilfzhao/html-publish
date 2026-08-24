'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';

type Project = { id: string; name: string; slug: string; icon?: string | null };
type Authorization = { userCode: string; clientName: string | null; status: string; expiresAt: string };

export default function ConnectPage() {
  return <Suspense fallback={<ConnectShell><Loading /></ConnectShell>}><ConnectContent /></Suspense>;
}

function ConnectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get('code') || '';
  const projectHint = searchParams.get('project')?.trim().toLowerCase() || '';
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [approving, setApproving] = useState(false);
  const [approvedProject, setApprovedProject] = useState<Project | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialCode) return;
    Promise.all([
      fetch(`/api/v1/auth/device?code=${encodeURIComponent(initialCode)}`).then((res) => res.ok ? res.json() : Promise.reject(new Error('Authorization request expired or not found.'))),
      fetch('/api/projects').then((res) => res.ok ? res.json() : Promise.reject(new Error('Unable to load projects.'))),
    ]).then(([auth, projectList]) => {
      setAuthorization(auth);
      setProjects(projectList);
      const hinted = projectList.find((project: Project) =>
        project.id.toLowerCase() === projectHint
        || project.slug.toLowerCase() === projectHint
        || project.name.toLowerCase().includes(projectHint)
      );
      if (hinted) setSelectedProject(hinted.id);
      else if (projectList.length === 1) setSelectedProject(projectList[0].id);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load authorization request.'))
      .finally(() => setLoading(false));
  }, [initialCode, projectHint]);

  const selected = useMemo(() => projects.find((project) => project.id === selectedProject), [projects, selectedProject]);

  const openCode = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/connect?code=${encodeURIComponent(normalized)}`);
  };

  const approve = async () => {
    if (!selectedProject || !authorization) return;
    setApproving(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/device/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: authorization.userCode, projectId: selectedProject }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authorization failed.');
      setApprovedProject(selected || data.project);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authorization failed.');
    } finally {
      setApproving(false);
    }
  };

  if (!initialCode) {
    return (
      <ConnectShell>
        <ShieldCheck className="mx-auto h-10 w-10 text-indigo-600" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Connect HTML Publish</h1>
        <p className="mt-2 text-sm text-gray-500">Enter the code shown by the publishing assistant.</p>
        <form onSubmit={openCode} className="mt-6 space-y-3">
          <input value={code} onChange={(event) => setCode(event.target.value)} className="input text-center font-mono uppercase tracking-[0.25em]" placeholder="ABCD2345" autoFocus />
          <button className="btn-primary w-full" type="submit">Continue</button>
        </form>
      </ConnectShell>
    );
  }

  if (loading) return <ConnectShell><Loading /></ConnectShell>;
  if (approvedProject) {
    return (
      <ConnectShell>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Connected</h1>
        <p className="mt-2 text-sm text-gray-500">The publishing assistant can now deploy to <strong>{approvedProject.name}</strong>.</p>
        <p className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">You can close this page. Publishing will continue automatically.</p>
      </ConnectShell>
    );
  }

  return (
    <ConnectShell>
      <ShieldCheck className="mx-auto h-10 w-10 text-indigo-600" />
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Allow AI publishing</h1>
      <p className="mt-2 text-sm text-gray-500"><strong>{authorization?.clientName || 'HTML Publish CLI'}</strong> wants permission to publish prototype versions.</p>
      <div className="mt-5 rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm tracking-[0.2em] text-gray-600">{initialCode}</div>
      <div className="mt-5 space-y-2 text-left">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Choose project</label>
        <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="input">
          <option value="">Select a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.icon || '📄'} {project.name}</option>)}
        </select>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <button type="button" onClick={approve} disabled={!selectedProject || approving} className="btn-primary mt-5 w-full disabled:opacity-50">
        {approving ? 'Authorizing...' : `Allow publishing${selected ? ` to ${selected.name}` : ''}`}
      </button>
      <p className="mt-4 text-xs leading-5 text-gray-400">This grants publish-only access to the selected project. It does not allow project deletion or settings changes.</p>
    </ConnectShell>
  );
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5"><section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">{children}</section></main>;
}

function Loading() {
  return <div className="flex flex-col items-center gap-3 py-8"><LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" /><p className="text-sm text-gray-500">Loading authorization request...</p></div>;
}
