import { useState, useRef, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

const gradientBg = 'linear-gradient(135deg, #D4785C 0%, #E8A4A0 50%, #F0C4B8 100%)';

export default function UploadPage() {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    setResult('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/files/upload', fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setResult('Fichier téléversé avec succès !');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: gradientBg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{
        color: '#333',
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '2rem',
      }}>
        Tu veux partager un fichier ?
      </h1>

      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            margin: '0 auto 1.5rem',
            transition: 'transform 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        {file && (
          <p style={{ color: '#333', marginBottom: '1rem', fontSize: '0.9rem' }}>
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        {file && (
          <button
            type="submit"
            disabled={uploading}
            style={{
              padding: '0.75rem 2rem',
              background: '#D4785C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? 'Envoi...' : 'Envoyer'}
          </button>
        )}
      </form>

      {result && (
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(255,255,255,0.9)',
          color: '#2a7',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontSize: '0.95rem',
        }}>✅ {result}</div>
      )}

      {error && (
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(255,255,255,0.9)',
          color: '#c00',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontSize: '0.95rem',
        }}>❌ {error}</div>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: '2rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
