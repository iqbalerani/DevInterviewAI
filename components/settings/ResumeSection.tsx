import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Trash2, RefreshCw, File, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { interviewService } from '../../services/interviewService';

const ResumeSection: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const saved = user?.resume;

  // Load text preview when resume exists
  useEffect(() => {
    if (!saved) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    interviewService.getSavedResume().then((r) => {
      if (!cancelled) setPreview(r.extractedText?.slice(0, 200) ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [saved?.uploadedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and TXT files are supported');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const base64 = await fileToBase64(file);
      const resume = await interviewService.uploadResume(file.name, file.type, base64);
      updateUser({ resume });
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await interviewService.deleteSavedResume();
      updateUser({ resume: null });
      setConfirmDelete(false);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Resume</h3>
      </div>

      <p className="text-sm text-slate-400">
        Upload your resume once and use it across Interview Setup and Resume Analyzer with one click.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {saved ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <File className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{saved.fileName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {saved.fileType === 'application/pdf' ? 'PDF' : 'TXT'}
                </span>
                <span className="text-xs text-slate-500">
                  Uploaded {new Date(saved.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {preview && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
              <p className="text-sm text-slate-400 line-clamp-4 font-mono leading-relaxed">
                {preview}{preview.length >= 200 ? '...' : ''}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.pdf" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Replace
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {confirmDelete ? 'Click again to confirm' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.pdf" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition-colors" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">
                {uploading ? 'Uploading...' : 'Click to upload your resume'}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF or TXT, max 5MB</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default ResumeSection;
