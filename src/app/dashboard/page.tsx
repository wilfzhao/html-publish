'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import {
  Plus,
  Search,
  Eye,
  ExternalLink,
  Calendar,
  User,
  MoreVertical,
  Globe,
  Lock,
  Users,
  Folder,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: string;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  coverUrl?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared'>('all');

  useEffect(() => {
    fetchProjects();
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

  const visibilityIcon = (vis: string) => {
    switch (vis) {
      case 'PUBLIC': return <Globe className="w-3 h-3" />;
      case 'INTERNAL': return <Users className="w-3 h-3" />;
      case 'PASSWORD': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const visibilityColor = (vis: string) => {
    switch (vis) {
      case 'PUBLIC': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'INTERNAL': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'PASSWORD': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

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

        {/* Search & filter bar */}
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
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'mine', 'shared'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
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
            { label: 'Teams', value: 1, icon: <Users className="w-4 h-4 text-purple-600" /> },
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
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.slug}`}
                className="card card-hover group overflow-hidden"
              >
                {/* Cover */}
                <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
                  {project.coverUrl ? (
                    <img src={project.coverUrl} alt={project.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`/p/${project.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/90 text-gray-900 px-4 py-2 rounded-lg text-xs font-medium shadow-sm inline-block"
                      >
                        Open Preview
                      </a>
                    </div>
                  </div>
                  {/* Visibility badge */}
                  <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border ${visibilityColor(project.visibility)}`}>
                    {visibilityIcon(project.visibility)}
                    {project.visibility.toLowerCase()}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate mb-3">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>v{project.currentVersionNumber}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {project.accessCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {/* New project card */}
            <Link href="/project/new" className="card card-hover border-2 border-dashed border-gray-200 hover:border-indigo-300 flex flex-col items-center justify-center min-h-[200px] text-center">
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 mb-2 transition-colors" />
              <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
                Create New Project
              </span>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
