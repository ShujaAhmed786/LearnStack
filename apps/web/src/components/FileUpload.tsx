import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, File, Loader2 } from 'lucide-react';
import { UploadResponse } from '@learnstack/shared';

interface FileUploadProps {
  onUploadSuccess: (file: UploadResponse) => void;
  className?: string;
}

const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'docx', 'mp4', 'webm'];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, className = '' }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type .${ext || 'unknown'} is not allowed. Only PDF, PPTX, DOCX, MP4, and WEBM are accepted.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 100MB limit.`;
    }
    return null;
  };

  const handleUpload = (file: File) => {
    setError(null);
    setUploadedFile(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    xhr.open('POST', `${BASE_URL}/v1/upload`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 90);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setProgress(100);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res: UploadResponse = JSON.parse(xhr.responseText);
          setUploadedFile(res);
          onUploadSuccess(res);
        } catch {
          setError('Failed to parse server response');
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          setError(errRes.error?.message || 'Upload failed');
        } catch {
          setError(`Upload failed with status code ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError('Network error occurred during file upload');
    };

    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-surface-hover/30 bg-surface'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.docx,.mp4,.webm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-primary">
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-primary" />
            ) : (
              <UploadCloud size={24} />
            )}
          </div>

          <div>
            <span className="text-14 font-semibold text-text">
              Click to upload or drag and drop
            </span>
            <p className="text-12 text-text-muted mt-0.5">
              PDF, PPTX, DOCX, MP4, or WEBM (Max 100MB)
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
          <div className="flex items-center justify-between text-12 text-text-muted">
            <span>Uploading...</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-13 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {uploadedFile && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-13 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <File size={16} className="shrink-0" />
            <span className="truncate font-medium">{uploadedFile.name}</span>
          </div>
          <CheckCircle2 size={16} className="shrink-0 ml-2" />
        </div>
      )}
    </div>
  );
};
