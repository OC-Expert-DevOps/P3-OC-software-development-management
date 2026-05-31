import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / (p.total || 1))),
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>⬆️ Upload a File</h1>
      {error && <div style={{ background: '#fee', color: '#c00', padding: '0.8rem', borderRadius: 4, marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed #aaa', borderRadius: 8, padding: '3rem', textAlign: 'center', cursor: 'pointer', background: file ? '#e8f5e9' : '#fafafa', marginBottom: '1rem' }}
        >
          {file ? (
            <p>📄 <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</p>
          ) : (
            <p style={{ color: '#888' }}>Drag & drop a file here, or click to select</p>
          )}
          <input ref={inputRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
        </div>
        {uploading && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ background: '#ddd', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ background: '#1a73e8', height: 8, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>{progress}%</p>
          </div>
        )}
        <button type="submit" disabled={!file || uploading}
          style={{ width: '100%', padding: '0.8rem', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, fontSize: '1rem', cursor: 'pointer', opacity: !file ? 0.5 : 1 }}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
