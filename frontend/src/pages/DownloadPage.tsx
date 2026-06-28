import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get(`/download/${token}`, { maxRedirects: 0, validateStatus: () => true });
        if (data?.originalName) setFileName(data.originalName);
        if (data?.sizeBytes) setFileSize(`${(Number(data.sizeBytes) / 1048576).toFixed(2)} MB`);
        setStatus('ready');
      } catch {
        setStatus('ready');
      }
    };
    check();
  }, [token]);

  const handleDownload = () => {
    window.location.href = `/api/download/${token}`;
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
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1.25rem', textAlign: 'center' }}>
          Télécharger un fichier
        </h1>

        {status === 'loading' && (
          <p style={{ color: '#999', textAlign: 'center', fontSize: '0.9rem' }}>Vérification du lien…</p>
        )}

        {status === 'error' && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
            ❌ {error || 'Ce lien est invalide ou expiré.'}
          </div>
        )}

        {status === 'ready' && (
          <>
            <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.25rem' }}>
              ✅ Ce fichier est disponible au téléchargement
            </div>

            {fileName && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem' }}>
                  <span style={{ color: '#999' }}>Fichier</span>
                  <span style={{ color: '#333', fontWeight: 500 }}>{fileName}</span>
                </div>
                {fileSize && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem' }}>
                    <span style={{ color: '#999' }}>Taille</span>
                    <span style={{ color: '#333', fontWeight: 500 }}>{fileSize}</span>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleDownload} style={{
              width: '100%',
              padding: '0.7rem',
              background: '#D4785C',
              color: '#fff',
              border: '2px solid #D4785C',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}>
              Télécharger ↓
            </button>
          </>
        )}
      </div>

      <footer style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
