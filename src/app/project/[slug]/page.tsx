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
  EyeOff,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Smartphone,
  Monitor,
  Tablet,
  QrCode,
  Plus,
  Upload,
  X,
  Paintbrush,
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PROJECT_EMOJI, PROJECT_EMOJIS } from '@/lib/project-emojis';
import { copyTextToClipboard } from '@/lib/client-clipboard';
import { normalizeProjectSlug } from '@/lib/project-slug';
import ManagementPasswordGate from './management-password-gate';
import { PrototypeAnnotations } from '@/components/annotations/prototype-annotations';

async function copyWithFeedback(value: string, successMessage = 'Copied!') {
  if (await copyTextToClipboard(value)) {
    toast.success(successMessage);
    return true;
  }

  toast.error('Copy failed. Select the text and copy it manually.');
  return false;
}

function EmojiPickerInline({ selected, onChange }: { selected: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-lg transition-colors flex-shrink-0"
        title="Pick icon"
      >
        {selected || DEFAULT_PROJECT_EMOJI}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-2">
            <div className="grid grid-cols-8 grid-rows-6 gap-1">
              {PROJECT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { onChange(e); setOpen(false); }}
                  className={`w-7 h-7 flex items-center justify-center text-base rounded-md hover:bg-gray-100 transition-colors ${
                    selected === e ? 'bg-indigo-50 ring-1 ring-indigo-400' : ''
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [annotationMode, setAnnotationMode] = useState(false);

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

  const handleCopyLink = async (version?: number) => {
    if (!project?.previewUrl && !project?.previewPath) return;
    const publicPreviewUrl = project.previewUrl || `${window.location.origin}${project.previewPath}`;
    const link = `${publicPreviewUrl}${version ? `/v/${version}` : ''}`;
    if (!(await copyWithFeedback(link, 'Link copied to clipboard'))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AppShell hideSidebar>
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
      <AppShell hideSidebar>
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

  if (project.locked) {
    return <ManagementPasswordGate slug={project.slug} projectName={project.name} />;
  }

  const currentVersion = project.currentVersionId
    ? project.versions?.find((v: any) => v.id === project.currentVersionId)
    : project.versions?.[0];
  const latestVersion = project.versions?.[0];
  const shareUrl = project.previewUrl || `${window.location.origin}${project.previewPath}`;
  const versionShareUrl = currentVersion
    ? `${shareUrl}/v/${encodeURIComponent(currentVersion.label || String(currentVersion.number))}`
    : shareUrl;

  const handleDeleteVersion = async (versionId: string, versionLabel: string) => {
    if (!confirm(`Delete ${versionLabel}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/versions/${versionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${versionLabel} deleted`);
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
    <AppShell hideSidebar>
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

                {currentVersion && (
                  <button
                    onClick={() => setAnnotationMode((value) => !value)}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${annotationMode ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="标出需要 UI 出高保真的区域"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    UI 标注
                  </button>
                )}

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
              {currentVersion ? (
                annotationMode ? (
                  <div className="flex-1 min-h-0">
                    <PrototypeAnnotations
                      projectId={project.id}
                      versionId={currentVersion.id}
                      iframeSrc={`/api/proxy/${project.slug}?v=${encodeURIComponent(currentVersion.label || String(currentVersion.number))}`}
                      mode="edit"
                      shareUrl={versionShareUrl}
                      deviceClassName={
                        previewDevice === 'desktop'
                          ? 'w-full max-w-7xl h-full rounded-xl'
                          : previewDevice === 'tablet'
                          ? 'w-[768px] h-[600px] rounded-xl'
                          : 'w-[375px] h-[667px] rounded-[2rem]'
                      }
                    />
                  </div>
                ) : (
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
                      src={`/api/proxy/${project.slug}?v=${encodeURIComponent(currentVersion.label || String(currentVersion.number))}`}
                      className="w-full h-full border-0"
                      title="Prototype Preview"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
                      style={{ minHeight: '100%' }}
                    />
                  </div>
                </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Upload className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1">No prototype uploaded yet</h3>
                  <p className="text-sm text-gray-400 mb-4">Upload your HTML file to see it previewed here</p>
                  <Link href={`/project/new?projectId=${project.id}`}>
                    <button className="btn-primary text-sm inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Now
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Versions tab */}
          {activeTab === 'versions' && (
            <div
              className={`${project.versions && project.versions.length > 0 ? 'p-6 lg:p-8' : ''} overflow-y-auto h-full`}
            >
              <div className={`max-w-3xl mx-auto ${!project.versions || project.versions.length === 0 ? 'h-full' : ''}`}>
                {project.versions && project.versions.length > 0 && (
                  <div className="mx-auto mb-6 flex w-full max-w-[524px] items-center justify-end">
                    <Link href={`/project/new?projectId=${project.id}&returnTo=versions`}>
                      <button className="btn-primary inline-flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        New Version
                      </button>
                    </Link>
                  </div>
                )}

                {(!project.versions || project.versions.length === 0) && (
                  <div
                    className="flex h-full flex-col items-center justify-center px-6 text-center"
                    style={{ paddingTop: 52 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <Upload className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">No prototype uploaded yet</h3>
                    <p className="text-sm text-gray-400 mb-4">Upload your first HTML file to create a version</p>
                    <Link href={`/project/new?projectId=${project.id}&returnTo=versions`}>
                      <button className="btn-primary text-sm inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Upload Now
                      </button>
                    </Link>
                  </div>
                )}

                {project.versions && project.versions.length > 0 && (
                  <div className="mx-auto w-full max-w-[524px] space-y-0">
                    {project.versions.map((v: any, i: number) => (
                      <div
                        key={v.id}
                        className="grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,420px)] sm:gap-4"
                      >
                        {/* Timeline */}
                        <div className="flex min-w-0 flex-col items-center">
                          <div
                            className={`flex h-9 max-w-full min-w-9 flex-shrink-0 items-center justify-center truncate rounded-full px-3 text-xs font-bold ${
                            project.currentVersionId === v.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          }`}
                            title={v.label || `v${v.number}`}
                          >
                            {v.label || v.number}
                          </div>
                          {i < project.versions.length - 1 && (
                            <div className="w-px flex-1 bg-gray-100 min-h-[20px]" />
                          )}
                        </div>

                        {/* Version card */}
                        <div className="min-w-0 pb-6">
                          <div className="card min-h-[72px] w-full p-4 transition-shadow hover:shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {v.note || `Version ${v.label || v.number}`}
                                  </span>
                                  {project.currentVersionId === v.id && (
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
                                  onClick={() => window.open(`/p/${project.slug}/v/${encodeURIComponent(v.label || String(v.number))}`, '_blank')}
                                  className="group p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
                                  title="Preview this version"
                                >
                                  <Eye className="w-4 h-4 group-hover:text-cyan-600" />
                                </button>
                                <button
                                  onClick={() => copyWithFeedback(`${shareUrl}/v/${encodeURIComponent(v.label || String(v.number))}`, 'Link copied!')}
                                  className="group p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
                                  title="Copy link to this version"
                                >
                                  <Copy className="w-4 h-4 group-hover:text-indigo-600" />
                                </button>
                                {project.currentVersionId !== v.id && (
                                  <button
                                    onClick={() => handleDeleteVersion(v.id, v.label || `v${v.number}`)}
                                    className="group p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
                                    title="Delete this version"
                                  >
                                    <Trash2 className="w-4 h-4 group-hover:text-rose-600" />
                                  </button>
                                 )}
                                 <button
                                  onClick={async () => {
                                    if (!confirm(`Roll back to ${v.label || `v${v.number}`}?`)) return;
                                    try {
                                      const res = await fetch(`/api/versions/${v.id}`, {
                                        method: 'POST',
                                      });
                                      if (res.ok) {
                                        toast.success(`Rolled back to ${v.label || `v${v.number}`}`);
                                        fetchProject();
                                      } else {
                                        const errData = await res.json();
                                        toast.error(errData.error || 'Rollback failed');
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
  const shareUrl = project.previewUrl || `${window.location.origin}${project.previewPath}`;
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description || '');
  const [visibility, setVisibility] = useState(project.visibility);
  const [password, setPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [icon, setIcon] = useState(project.icon || DEFAULT_PROJECT_EMOJI);
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          visibility,
          password: password || undefined,
          icon: icon || null,
        }),
      });
      if (res.ok) {
        const updatedProject = await res.json();
        toast.success('Settings saved');
        setPassword('');
        setChangingPassword(false);
        setShowPassword(false);
        if (updatedProject.slug !== project.slug) {
          router.replace(`/project/${updatedProject.slug}`);
        } else {
          onUpdate();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const visibilityOptions = [
    { value: 'PUBLIC', label: 'Public', desc: 'Anyone with the link can view', emoji: '🌍' },
    { value: 'PASSWORD', label: 'Password', desc: 'Requires a password to manage this project', emoji: '🔒' },
  ];

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Project info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Project Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
              <div className="flex items-center gap-3">
                <EmojiPickerInline selected={icon} onChange={setIcon} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Slug</label>
              <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <span className="pl-3 text-sm font-mono text-gray-400">/p/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(normalizeProjectSlug(e.target.value))}
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm font-mono outline-none"
                />
              </div>
              {slug !== project.slug && (
                <p className="mt-1.5 text-xs text-amber-600">Changing this will invalidate previously shared links.</p>
              )}
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
                  value={shareUrl}
                  readOnly
                  className="input font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => copyWithFeedback(shareUrl)}
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {project.hasPassword && !changingPassword && (
                  <span className="text-xs font-medium text-emerald-600">Password is set</span>
                )}
              </div>
              {project.hasPassword && !changingPassword ? (
                <div className="flex items-center gap-2">
                  <input type="password" value="password-is-set" readOnly className="input" aria-label="Saved password" />
                  <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => setChangingPassword(true)}>
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={project.hasPassword ? 'Enter a new password' : 'Enter a password'}
                      className="input pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {project.hasPassword && (
                    <button
                      type="button"
                      onClick={() => { setChangingPassword(false); setPassword(''); setShowPassword(false); }}
                      className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Cancel password change
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <AiPublishCard project={project} />
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

type DeployToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function AiPublishCard({ project }: { project: any }) {
  const [tokens, setTokens] = useState<DeployToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishServer, setPublishServer] = useState('');

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/tokens`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    setPublishServer(window.location.origin);
  }, []);

  const revokeToken = async (tokenId: string) => {
    const res = await fetch(`/api/projects/${project.id}/tokens/${tokenId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadTokens();
      toast.success('Publishing access revoked');
    } else {
      toast.error('Failed to revoke token');
    }
  };

  const skillSource = process.env.NEXT_PUBLIC_SKILL_REPO_URL
    || 'https://github.com/wilfzhao/html-publish/tree/main/integrations/skills/publish-html-prototype';
  const cliPackageUrl = publishServer
    ? `${publishServer}/api/v1/cli/package?server=${encodeURIComponent(publishServer)}`
    : '';
  const cliInstallCommand = cliPackageUrl ? `npm install -g '${cliPackageUrl}'` : '';
  const installPrompt = `$skill-installer 从 ${skillSource} 安装 publish-html-prototype`;
  const activeTokens = tokens.filter((token) => !token.revokedAt);
  const publishPrompt = `使用 $publish-html-prototype，把当前原型发布到「${project.name}」，备注「描述本次修改」`;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Publish</h2>
          <p className="text-sm text-gray-500 mt-1">Let an AI coding agent publish new prototype versions directly.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">MVP</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">1. Install CLI</label>
          {cliInstallCommand ? (
            <CopyableCommand value={cliInstallCommand} />
          ) : (
            <div className="h-10 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
          )}
          <p className="mt-1.5 text-xs text-gray-400">Run once from any directory. The CLI is downloaded from this server and automatically remembers its address.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">2. Install Skill in Codex</label>
          <CopyableCommand value={installPrompt} />
          <p className="mt-1.5 text-xs text-gray-400">Paste this sentence into Codex. The Skill will be available on the next turn.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">3. Publish with AI</label>
          <CopyableCommand value={publishPrompt} />
          <p className="mt-1.5 text-xs text-gray-400">On the first publish, a browser page opens automatically. Choose this project and click Allow; publishing then continues by itself.</p>
        </div>
        {!loading && activeTokens.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Connected publishing clients</label>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {activeTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800">{token.name}</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {token.tokenPrefix}… · {token.lastUsedAt ? `used ${new Date(token.lastUsedAt).toLocaleDateString()}` : 'never used'}
                    </div>
                  </div>
                  <button type="button" onClick={() => revokeToken(token.id)} className="text-xs font-medium text-rose-600 hover:text-rose-700">Revoke</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyableCommand({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyWithFeedback(value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-all text-xs text-gray-700">{value}</code>
      <button type="button" onClick={copy} className="flex-shrink-0 text-gray-400 hover:text-indigo-600" aria-label="Copy command">
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
