import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function UploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5rem 1.5rem 2rem',
    }}>
      {!file ? (
        /* Drop zone */
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            padding: '3rem',
            borderRadius: '16px',
            border: dragOver ? '2px dashed rgba(255,255,255,0.6)' : '2px dashed transparent',
            transition: 'border 0.2s',
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', color: '#fff',
          }}>☁</div>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 500, textAlign: 'center' }}>
            Tu veux partager un fichier ?
          </span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
            Clique ou glisse un fichier ici
          </span>
          <input ref={fileRef} type="file" hidden onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      ) : (
        /* File selected — confirm upload */
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1.25rem', textAlign: 'center' }}>
            Téléverser un fichier
          </h2>

          {error && (
            <div style={{ background: '#FFEBEE', color: '#C62828', padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ background: '#F5F5F5', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>{(file.size / 1048576).toFixed(2)} MB</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setFile(null)} style={{
                flex: 1, padding: '0.7rem', background: 'transparent',
                color: '#333', border: '2px solid #333', borderRadius: '8px',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>Annuler</button>
              <button type="submit" disabled={uploading} style={{
                flex: 1, padding: '0.7rem', background: '#D4785C',
                color: '#fff', border: '2px solid #D4785C', borderRadius: '8px',
                fontSize: '0.9rem', fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1, fontFamily: "'Inter', sans-serif",
              }}>{uploading ? 'Envoi…' : 'Téléverser ☁'}</button>
            </div>
          </form>
        </div>
      )}

      <footer style={{ marginTop: 'auto', padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
