'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { AppShell } from '@/components/layout/app-shell';
import {
  Plus,
  Search,
  Eye,
  Calendar,
  Folder,
  Loader2,
  Upload,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PROJECT_EMOJI, PROJECT_EMOJIS } from '@/lib/project-emojis';

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: string;
  currentVersionNumber: number;
  previewPath: string;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  coverUrl: string | null;
  icon: string | null;
  versions: Array<{
    id: string;
    number: number;
    label: string | null;
    coverUrl: string;
  }>;
}

function EmojiPicker({ selected, onChange }: { selected: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-lg transition-colors flex-shrink-0"
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

function EditProjectForm({ project, onClose, onSave }: {
  project: Project;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [visibility, setVisibility] = useState(project.visibility);
  const [icon, setIcon] = useState(project.icon || DEFAULT_PROJECT_EMOJI);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), visibility, icon: icon || null }),
      });
      if (res.ok) {
        toast.success('Project updated');
        onSave();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const visibilityColor = (vis: string) => {
    switch (vis) {
      case 'PUBLIC': return 'bg-emerald-500 text-white';
      case 'PASSWORD': return 'bg-amber-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Edit Project</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Icon picker */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 w-8 flex-shrink-0">Icon</label>
          <EmojiPicker selected={icon} onChange={setIcon} />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input h-9 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-none h-16 text-sm"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Visibility</label>
          <div className="flex gap-1">
            {(['PUBLIC', 'PASSWORD'] as const).map((vis) => (
              <button
                key={vis}
                type="button"
                onClick={() => setVisibility(vis)}
                className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  visibility === vis
                    ? `${visibilityColor(vis)} shadow-sm`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {vis === 'PUBLIC' ? 'Public' : 'Password'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="flex-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoveredPreviewProjectId, setHoveredPreviewProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const resetPreviewHover = () => setHoveredPreviewProjectId(null);
    const handleVisibilityChange = () => {
      if (document.hidden) resetPreviewHover();
    };

    window.addEventListener('blur', resetPreviewHover);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', resetPreviewHover);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ProtoHost Dashboard 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {projects.length} prototype{projects.length !== 1 ? 's' : ''} deployed
            </p>
          </div>
          <Link href="/project/new">
            <button className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </Link>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 h-10"
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: projects.length, icon: <Folder className="w-4 h-4 text-indigo-600" /> },
            { label: 'Total Views', value: projects.reduce((sum, p) => sum + p.accessCount, 0), icon: <Eye className="w-4 h-4 text-emerald-600" /> },
            { label: 'This Month', value: projects.filter((p) => {
              const d = new Date(p.updatedAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length, icon: <Calendar className="w-4 h-4 text-amber-600" /> },
            { label: 'Versions', value: projects.reduce((sum, p) => sum + p.versions.length, 0), icon: <Upload className="w-4 h-4 text-purple-600" /> },
          ].map((stat, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {search
                ? 'Try a different search term'
                : 'Create your first project and deploy your prototype'}
            </p>
            {!search && (
              <Link href="/project/new">
                <button className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => {
              const visibleVersions = project.versions.slice(0, 3);

              return (
                <article
                key={project.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/project/${project.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/project/${project.slug}`);
                  }
                }}
                className="group relative min-h-[270px] overflow-hidden rounded-[26px] border border-gray-200/80 bg-white p-5 cursor-pointer outline-none shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_14px_32px_rgba(79,70,229,0.09)] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-center text-sm"
                    title={project.visibility.toLowerCase()}
                  >
                    <span className="text-base leading-none">{project.icon || DEFAULT_PROJECT_EMOJI}</span>
                  </div>
                  <ArrowUpRight
                    className={`h-5 w-5 text-gray-300 transition-all duration-300 ${
                      hoveredPreviewProjectId === project.id
                        ? ''
                        : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-700'
                    }`}
                  />
                </div>

                <div className="mt-4">
                  <h3 className="truncate text-lg font-bold tracking-[-0.02em] text-gray-900">
                    {project.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] font-normal leading-5 text-gray-400/90">
                    Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                  </p>
                </div>

                {visibleVersions.length > 0 ? (
                  <div
                    className="group/preview absolute bottom-5 left-5 right-5"
                    style={{ height: 120 }}
                    onMouseEnter={() => setHoveredPreviewProjectId(project.id)}
                    onMouseLeave={() => setHoveredPreviewProjectId(null)}
                  >
                    {[...visibleVersions].reverse().map((version) => {
                      const depth = visibleVersions.findIndex((item) => item.id === version.id);
                      const isFront = depth === 0;
                      const isPreviewHovered = hoveredPreviewProjectId === project.id;
                      const layerGap = isPreviewHovered ? 20 : 14;
                      const offset = depth * layerGap;
                      const oppositeOffset = (visibleVersions.length - 1 - depth) * layerGap;

                      return (
                        <div
                          key={version.id}
                          className="absolute inset-y-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out"
                          style={{
                            left: offset,
                            right: oppositeOffset,
                            zIndex: visibleVersions.length - depth,
                            opacity: 1 - depth * 0.08,
                            transform: isFront && isPreviewHovered
                              ? 'translateY(-4px) rotate(-1deg)'
                              : `translateY(${depth * 2}px)`,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <Upload className="h-7 w-7 text-gray-300" />
                          </div>
                          <img
                            src={version.coverUrl}
                            alt={`${project.name} version ${version.label || version.number} preview`}
                            className="absolute inset-0 h-full w-full object-cover object-top"
                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                          />
                          {isFront ? (
                            <>
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-8 items-center justify-between gap-2 rounded-b-xl bg-gradient-to-t from-white/60 via-white/30 to-transparent px-2.5 text-gray-600 backdrop-blur-[1px]">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium">
                                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-600">{version.label || `v${version.number}`}</span>
                                  <span>Latest</span>
                                </span>
                                <span className="text-[10px] font-medium text-gray-400">
                                  {project.versions.length} {project.versions.length === 1 ? 'version' : 'versions'}
                                </span>
                              </div>
                              <div className={`absolute inset-0 z-30 flex items-center justify-center transition-all duration-300 ${
                                isPreviewHovered ? 'bg-gray-950/10 opacity-100' : 'bg-gray-950/0 opacity-0'
                              }`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setHoveredPreviewProjectId(null);
                                    window.open(
                                      `/p/${project.slug}/v/${encodeURIComponent(version.label || String(version.number))}`,
                                      '_blank',
                                      'noopener,noreferrer'
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-lg transition-transform duration-200 hover:scale-105"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </button>
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="absolute bottom-5 left-5 right-5 flex items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 transition-colors duration-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/70"
                    style={{ height: 120 }}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                        <Upload className="h-4 w-4 text-indigo-500" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-600">No prototype yet</span>
                        <span className="mt-0.5 block text-xs text-gray-400">Upload the first version</span>
                      </span>
                    </div>
                  </div>
                )}
                </article>
              );
            })}

            {/* New project card */}
            <Link href="/project/new" className="group flex min-h-[270px] flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-indigo-200/80 bg-white text-center transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-[0_14px_32px_rgba(79,70,229,0.07)]">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-indigo-100">
                <Plus className="h-6 w-6 text-gray-400 transition-colors group-hover:text-indigo-600" />
              </span>
              <span className="text-base font-semibold text-gray-500 transition-colors group-hover:text-indigo-700">
                Create New Project
              </span>
              <span className="mt-1 text-xs text-gray-400">Start a new prototype</span>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
