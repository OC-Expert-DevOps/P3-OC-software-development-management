import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useIsMobile } from '../hooks/useIsMobile';

// The backend's error messages are an internal English-language API contract
// (see docs/architecture/openapi.yaml), not user-facing copy — showing them
// as-is breaks the French UI and, for a 429, would leak the raw exception
// class name ("ThrottlerException: Too Many Requests") to the visitor.
function translateDownloadError(status: number | undefined): string {
  switch (status) {
    case 401:
      return 'Mot de passe incorrect.';
    case 404:
      return 'Ce lien est invalide ou introuvable.';
    case 410:
      return 'Ce lien de téléchargement a expiré ou a atteint sa limite d\'utilisation.';
    case 429:
      return 'Trop de tentatives. Merci de réessayer dans quelques instants.';
    default:
      return 'Téléchargement échoué. Merci de réessayer.';
  }
}

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const isTablet = useIsMobile(768);
  const isMobileNav = useIsMobile(430);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get(`/download/${token}/info`);
        setFileName(data.originalName || '');
        if (data.sizeBytes) setFileSize(`${(Number(data.sizeBytes) / 1048576).toFixed(2)} MB`);
        setHasPassword(data.hasPassword === true);
        setStatus('ready');
      } catch (err: any) {
        setError(translateDownloadError(err.response?.status));
        setStatus('error');
      }
    };
    check();
  }, [token]);

  const handleDownload = async () => {
    setError('');
    setDownloading(true);
    try {
      const params = hasPassword && password ? `?password=${encodeURIComponent(password)}` : '';
      // Use fetch to get the file as a blob (handles auth errors properly)
      const resp = await fetch(`/api/download/${token}${params}`);

      if (!resp.ok) {
        setError(translateDownloadError(resp.status));
        setDownloading(false);
        return;
      }

      // Trigger browser download from blob
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobileNav ? '1.5rem 1rem' : isTablet ? '4rem 1rem 1.5rem' : '5rem 1.5rem 2rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: isTablet ? '1.5rem' : '2.5rem',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1.25rem', textAlign: 'center' }}>
          Télécharger un fichier
        </h1>

        {status === 'loading' && (
          <p role="status" style={{ color: '#999', textAlign: 'center', fontSize: '0.9rem' }}>Vérification du lien…</p>
        )}

        {status === 'error' && (
          <div role="alert" style={{ background: '#FFEBEE', color: '#C62828', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
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

            {/* Password field if file is protected */}
            {hasPassword && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="download-password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
                  🔒 Ce fichier est protégé par un mot de passe
                </label>
                <input
                  id="download-password"
                  type="password"
                  placeholder="Saisissez le mot de passe…"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            )}

            {/* Error message (e.g. wrong password) */}
            {error && (
              <div role="alert" style={{ background: '#FFEBEE', color: '#C62828', padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>
                ❌ {error}
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading || (hasPassword && !password)}
              style={{
                width: '100%',
                padding: '0.7rem',
                background: '#D4785C',
                color: '#fff',
                border: '2px solid #D4785C',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: downloading || (hasPassword && !password) ? 'not-allowed' : 'pointer',
                opacity: downloading || (hasPassword && !password) ? 0.6 : 1,
                fontFamily: "'Inter', sans-serif",
              }}>
              {downloading ? 'Téléchargement…' : 'Télécharger ↓'}
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
