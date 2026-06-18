import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

const gradientBg = 'linear-gradient(135deg, #D4785C 0%, #E8A4A0 50%, #F0C4B8 100%)';

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get(`/download/${token}`, { maxRedirects: 0, validateStatus: () => true });
        if (data?.originalName) setFileName(data.originalName);
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
      background: gradientBg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <p style={{ color: '#888' }}>Vérification du lien...</p>
        )}

        {status === 'error' && (
          <div>
            <p style={{ color: '#c00', fontSize: '1.1rem', marginBottom: '1rem' }}>❌ {error}</p>
            <a href="/" style={{ color: '#D4785C', textDecoration: 'none' }}>Retour à l'accueil</a>
          </div>
        )}

        {status === 'ready' && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>

            <h2 style={{ color: '#333', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Téléchargement prêt
            </h2>
            {fileName && <p style={{ color: '#777', fontSize: '0.9rem', marginBottom: '1.5rem' }}>📄 {fileName}</p>}

            <button
              onClick={handleDownload}
              style={{
                padding: '0.75rem 2.5rem',
                background: '#D4785C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Télécharger
            </button>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
