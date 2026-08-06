'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import {
  Play,
  History,
  Settings,
  ExternalLink,
  Copy,
  Check,
  Eye,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Smartphone,
  Monitor,
  Tablet,
  QrCode,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'versions' | 'settings'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'versions') return 'versions';
    if (tab === 'settings') return 'settings';
    return 'preview';
  });
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'phone'>('desktop');

  const fetchProject = useCallback(async () => {
    try {
      let res;
      // Try by slug first (normal case)
      if (slug && slug.trim() !== '') {
        res = await fetch(`/api/projects?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data[0]) {
            setProject(data[0]);
            setLoading(false);
            return;
          }
        }
      }
      // Fallback: try by ID (slug might be empty or a UUID)
      res = await fetch(`/api/projects?id=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data[0] || null);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    const interval = setInterval(fetchProject, 30000);
    return () => clearInterval(interval);
  }, [fetchProject]);

  const handleCopyLink = (version?: number) => {
    const link = version
      ? `${window.location.origin}/api/proxy/${slug}?v=${version}`
      : `${window.location.origin}/api/proxy/${slug}?v=1`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading project...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="p-6 flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Project not found</h3>
            <p className="text-gray-500 text-sm mb-6">This project may have been deleted.</p>
            <Link href="/dashboard">
              <button className="btn-primary">Go to Dashboard</button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const latestVersion = project.versions?.[0];
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/p/${slug}`;
  const versionShareUrl = latestVersion
    ? `${baseUrl}/p/${slug}?v=${latestVersion.number}`
    : shareUrl;

  const handleDeleteVersion = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Delete v${versionNumber}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/versions/${versionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`v${versionNumber} deleted`);
        fetchProject();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete version');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDelete = async () => {
    if (!project) {
      toast.error('Project not loaded');
      return;
    }
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Project deleted');
        router.push('/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 lg:px-8 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h1>
              <p className="text-xs text-gray-400">
                {project._count?.versions || 0} version{project._count?.versions !== 1 ? 's' : ''} · Updated {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
            <button onClick={fetchProject} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'preview', label: 'Preview', icon: Play },
              { key: 'versions', label: 'Versions', icon: History },
              { key: 'settings', label: 'Settings', icon: Settings },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {/* Preview tab */}
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex items-center gap-2 flex-shrink-0">
                {/* Device toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  {([
                    { key: 'desktop' as const, icon: Monitor },
                    { key: 'tablet' as const, icon: Tablet },
                    { key: 'phone' as const, icon: Smartphone },
                  ]).map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setPreviewDevice(d.key)}
                      className={`p-1.5 rounded-md transition-all ${
                        previewDevice === d.key
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <d.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="w-px h-6 bg-gray-200" />

                {/* URL bar */}
                <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-400 truncate">{shareUrl}</span>
                </div>

                <div className="w-px h-6 bg-gray-200" />

                <button
                  onClick={() => handleCopyLink()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                  title="Copy share link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                <a
                  href={versionShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Open
                </a>
              </div>

              {/* Preview iframe */}
              <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center p-3">
                <div
                  className={`bg-white shadow-sm transition-all duration-300 overflow-hidden ${
                    previewDevice === 'desktop'
                      ? 'w-full max-w-7xl h-full rounded-xl'
                      : previewDevice === 'tablet'
                      ? 'w-[768px] h-[600px] rounded-xl'
                      : 'w-[375px] h-[667px] rounded-[2rem]'
                  }`}
                >
                  <iframe
                    src={latestVersion ? `/api/proxy/${slug}?v=${latestVersion.number}` : ''}
                    className="w-full h-full border-0"
                    title="Prototype Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    style={{ minHeight: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Versions tab */}
          {activeTab === 'versions' && (
            <div className="p-6 lg:p-8 overflow-y-auto h-full">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
                  <Link href={`/project/new?projectId=${project.id}`}>
                    <button className="btn-primary inline-flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      New Version
                    </button>
                  </Link>
                </div>

                {(!project.versions || project.versions.length === 0) && (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <History className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No versions yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload your first HTML file to create a version</p>
                    <Link href={`/project/new?projectId=${project.id}`}>
                      <button className="btn-primary text-sm">Upload</button>
                    </Link>
                  </div>
                )}

                {project.versions && project.versions.length > 0 && (
                  <div className="space-y-0 max-w-[600px]">
                    {project.versions.map((v: any, i: number) => (
                      <div key={v.id} className="flex gap-4">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            i === 0 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          }`}>
                            {v.number}
                          </div>
                          {i < project.versions.length - 1 && (
                            <div className="w-px flex-1 bg-gray-100 min-h-[20px]" />
                          )}
                        </div>

                        {/* Version card */}
                        <div className={`pb-6 ${i < project.versions.length - 1 ? '' : ''}`}>
                          <div style={{ width: 380 }} className="card p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {v.note || `Version ${v.number}`}
                                  </span>
                                  {i === 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 truncate">
                                  {new Date(v.createdAt).toLocaleString()} · by {v.creator?.name || 'Unknown'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => window.open(`/api/proxy/${project.slug}?v=${v.number}`, '_blank')}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-cyan-600 transition-colors"
                                  title="Preview this version"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {i !== 0 && (
                                  <button
                                    onClick={() => handleDeleteVersion(v.id, v.number)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-colors"
                                    title="Delete this version"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Roll back to v${v.number}?`)) return;
                                    try {
                                      const res = await fetch(`/api/versions/${v.id}`, {
                                        method: 'POST',
                                      });
                                      if (res.ok) {
                                        toast.success(`Rolled back to v${v.number}`);
                                        fetchProject();
                                      } else {
                                        toast.error('Rollback failed');
                                      }
                                    } catch {
                                      toast.error('Network error');
                                    }
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                                  title="Roll back to this version"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <SettingsTab project={project} onUpdate={fetchProject} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SettingsTab({ project, onUpdate, onDelete }: { project: any; onUpdate: () => void; onDelete: () => void }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [visibility, setVisibility] = useState(project.visibility);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [project.id]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          visibility,
          password: password || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Settings saved');
        onUpdate();
        setPassword('');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
        toast.success('Comment added');
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setSendingComment(false);
    }
  };

  const visibilityOptions = [
    { value: 'PUBLIC', label: 'Public', desc: 'Anyone with the link can view', emoji: '🌍' },
    { value: 'INTERNAL', label: 'Internal', desc: 'Only logged-in users can view', emoji: '🏢' },
    { value: 'PASSWORD', label: 'Password', desc: 'Requires a password to view', emoji: '🔒' },
  ];

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Project info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Project Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Public URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/api/proxy/${project.slug}?v=1`}
                  readOnly
                  className="input font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/proxy/${project.slug}?v=1`);
                    toast.success('Copied!');
                  }}
                  className="btn-secondary text-xs py-1.5"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Visibility</h2>
          <div className="space-y-2">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  visibility === opt.value
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{opt.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {visibility === 'PASSWORD' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="input"
              />
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button
              className="btn-primary"
              onClick={handleSendComment}
              disabled={sendingComment || !newComment.trim()}
            >
              Send
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-700">{c.authorName}</span>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card p-6 border border-rose-200 bg-rose-50/30">
          <h2 className="text-base font-semibold text-rose-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">Permanently delete this project and all versions.</p>
          <button className="btn-danger text-sm px-4 py-2" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
