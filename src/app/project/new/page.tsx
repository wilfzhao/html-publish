'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validate';

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INTERNAL' | 'PASSWORD'>('PUBLIC');
  const [password, setPassword] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          description: description.trim() || undefined,
          visibility,
          password: visibility === 'PASSWORD' ? password : undefined,
          expireAt: expireAt || undefined,
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

    const tooLarge = valid.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      toast.warning(`${tooLarge.length} file(s) exceed the size limit`);
    }

    setFiles((prev) => [...prev, ...valid]);
  }, []);

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
      formData.append('note', description || 'Initial upload');

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
        router.push(`/project/${createdProject!.slug}`);
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

        <div className="card p-8">
          {/* Step 1: Create project */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Project</h2>
                <p className="text-sm text-gray-500">Set up your prototype project</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Checkout Flow v3"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="space-y-2">
                  {([
                    { value: 'PUBLIC', label: 'Public', desc: 'Anyone with the link can view', icon: '🌍' },
                    { value: 'INTERNAL', label: 'Internal', desc: 'Only logged-in users can view', icon: '🏢' },
                    { value: 'PASSWORD', label: 'Password Protected', desc: 'Requires a password to view', icon: '🔒' },
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
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a password"
                    className="input"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button className="btn-primary text-base px-8" onClick={handleCreateProject}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && createdProject && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Upload to {createdProject.name}
                </h2>
                <p className="text-sm text-gray-500">Drop your HTML files or select them from your computer</p>
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
                  Drop files here or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  HTML, CSS, JS, images supported • Max 50MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".html,.htm,.css,.js,.json,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.map,.xml"
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
                <button
                  className="btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={uploading}
                >
                  Back
                </button>
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
