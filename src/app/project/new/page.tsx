'use client';

import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import {
  ArrowRight,
  Upload,
  FolderOpen,
  File,
  Check,
  X,
  AlertCircle,
  FileCode,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validate';
import { DEFAULT_PROJECT_EMOJI, PROJECT_EMOJIS } from '@/lib/project-emojis';
import { normalizeProjectSlug } from '@/lib/project-slug';

export default function NewProjectPage() {
  return (
    <Suspense fallback={<NewProjectPageFallback />}>
      <NewProjectPageContent />
    </Suspense>
  );
}

function NewProjectPageFallback() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="card p-8 animate-pulse">
          <div className="h-6 w-44 rounded bg-gray-200 mb-3" />
          <div className="h-4 w-64 rounded bg-gray-100 mb-8" />
          <div className="space-y-5">
            <div className="h-10 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-20 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function NewProjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewVersion = searchParams.has('projectId');
  const returnToVersions = searchParams.get('returnTo') === 'versions';
  const [step, setStep] = useState<1 | 2>(() => (isNewVersion ? 2 : 1));
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PASSWORD'>('PUBLIC');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expireAt, setExpireAt] = useState('');
  const [icon, setIcon] = useState<string>(DEFAULT_PROJECT_EMOJI);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [versionNote, setVersionNote] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [createdProject, setCreatedProject] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectReturnPath = (projectSlug?: string) => projectSlug
    ? `/project/${projectSlug}${returnToVersions ? '?tab=versions' : ''}`
    : '/dashboard';

  // Load project info for new version flow
  useEffect(() => {
    if (isNewVersion && !createdProject) {
      const projectId = searchParams.get('projectId');
      if (projectId) {
        fetch(`/api/projects?id=${projectId}`)
          .then(r => r.json())
          .then(data => {
            const project = data[0];
            setCreatedProject(project);
            // For new version, clear note so filename default takes effect
            setVersionNote('');
          });
      }
    }
  }, [isNewVersion, searchParams]);

  const handleCreateProject = async () => {
    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          visibility,
          password: visibility === 'PASSWORD' ? password : undefined,
          icon: icon || null,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        setCreatedProject(project);
        setStep(2);
        toast.success('Project created!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create project');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase() || '';
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    const invalidCount = newFiles.length - valid.length;
    if (invalidCount > 0) {
      toast.warning('Only .html files are supported');
    }

    const tooLarge = valid.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      toast.warning(`${tooLarge.length} file(s) exceed the size limit`);
    }

    const accepted = valid.filter((f) => f.size <= MAX_FILE_SIZE);
    setFiles((prev) => [...prev, ...accepted]);
    // Set default note from filename (strip extension) for new versions
    if (accepted.length > 0 && isNewVersion) {
      const name = accepted[0].name.replace(/\.[^/.]+$/, '');
      setVersionNote(name);
    }
  }, [isNewVersion]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      handleFilesSelected(dropped);
    },
    [handleFilesSelected]
  );

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('projectId', createdProject!.id);
      formData.append('note', versionNote || 'Initial upload');
      if (versionLabel.trim()) formData.append('version', versionLabel.trim());

      setUploadProgress(40);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (res.ok) {
        const data = await res.json();
        setUploadProgress(100);
        toast.success('Upload complete!');
        router.push(projectReturnPath(data.project?.slug || createdProject!.slug));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Upload failed');
        setUploading(false);
      }
    } catch {
      toast.error('Network error');
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Steps indicator */}
        {step === 1 && (
          <div className="flex items-center gap-3 mb-10">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    s === step
                      ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.4)]'
                      : s < step
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm font-medium ${
                  s === step ? 'text-gray-900' : s < step ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  {s === 1 ? 'Create' : 'Upload'}
                </span>
                {s < 2 && (
                  <div className={`w-12 h-0.5 transition-all duration-300 ${s < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card p-8">
          {/* Step 1: Create project */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Project</h2>
                <p className="text-sm text-gray-500">Set up your prototype project</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-lg transition-colors"
                      title="Pick icon"
                      aria-label="Pick project icon"
                    >
                      {icon}
                    </button>
                    {showEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                          <div className="grid grid-cols-8 grid-rows-6 gap-1">
                            {PROJECT_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setIcon(emoji);
                                  setShowEmojiPicker(false);
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-base transition-colors hover:bg-gray-100 ${
                                  icon === emoji ? 'bg-indigo-50 ring-1 ring-indigo-400' : ''
                                }`}
                                aria-label={`Use ${emoji} as project icon`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Checkout Flow v3"
                    className="input flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this prototype..."
                  className="input resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom URL (optional)</label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <span className="pl-3 text-sm font-mono text-gray-400">/p/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(normalizeProjectSlug(e.target.value))}
                    placeholder="checkout-v3"
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm font-mono outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Leave blank to generate automatically. Must be unique.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="space-y-2">
                  {([
                    { value: 'PUBLIC', label: 'Public', desc: 'Anyone with the link can view', icon: '🌍' },
                    { value: 'PASSWORD', label: 'Password Protected', desc: 'Requires a password to manage this project', icon: '🔒' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        visibility === opt.value
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{opt.icon}</span>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500">{opt.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {visibility === 'PASSWORD' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a password"
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
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="btn-secondary"
                  onClick={() => isNewVersion ? router.push(projectReturnPath(createdProject?.slug)) : router.back()}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button className="btn-primary text-base px-8" onClick={handleCreateProject}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && createdProject && (
            <div className="space-y-6 pt-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Upload to {createdProject.name}
                </h2>
                <p className="text-sm text-gray-500">Drop your HTML file or select it from your computer</p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`dropzone ${
                  dragging ? 'dropzone-active' : 'dropzone-idle'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                  dragging ? 'text-indigo-500' : 'text-indigo-400'
                }`} />
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Drop an HTML file here or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  .html only • Max 50MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    handleFilesSelected(selected);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <FileCode className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-700 truncate">{file.name}</div>
                          <div className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                <input
                  type="text"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g., 0.2.0 or v0.2.0"
                  className="input font-mono"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Optional. If empty, it is detected from the filename or a version meta tag, then falls back to an automatic number.
                </p>
              </div>

              {/* Version note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Version Note</label>
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="e.g., Fix layout, Add navigation"
                  className="input"
                />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {uploadProgress < 100 ? 'Uploading...' : 'Complete!'} {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <div className="flex gap-3">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (isNewVersion && createdProject?.slug) {
                        router.push(projectReturnPath(createdProject.slug));
                      } else {
                        router.back();
                      }
                    }}
                    disabled={uploading}
                  >
                    Back
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (isNewVersion && createdProject?.slug) {
                        router.push(projectReturnPath(createdProject.slug));
                      } else {
                        router.back();
                      }
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="btn-primary disabled:opacity-50"
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                >
                  {uploading ? 'Uploading...' : 'Upload & Deploy'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
