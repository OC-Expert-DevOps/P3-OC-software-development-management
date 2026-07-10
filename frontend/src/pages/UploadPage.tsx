import { useState, useRef, FormEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useIsMobile } from '../hooks/useIsMobile';

export default function UploadPage() {
  const navigate = useNavigate();
  const isTablet = useIsMobile(768);
  const isMobileNav = useIsMobile(430);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [password, setPassword] = useState('');
  const [ttlDays, setTtlDays] = useState(7);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
  };

  const handleDropzoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileRef.current?.click();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (password) fd.append('password', password);
      fd.append('expiryDays', String(ttlDays));
      await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 0.9rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
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
      {!file ? (
        /* Drop zone */
        <div
          role="button"
          tabIndex={0}
          aria-label="Téléverser un fichier : cliquer ou glisser-déposer un fichier ici"
          onClick={() => fileRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            padding: isTablet ? '2rem' : '3rem',
            borderRadius: '16px',
            border: dragOver ? '2px dashed rgba(255,255,255,0.6)' : '2px dashed transparent',
            transition: 'border 0.2s',
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#2D2D2D', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 500, textAlign: 'center' }}>
            Tu veux partager un fichier ?
          </span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
            Clique ou glisse un fichier ici
          </span>
          <input ref={fileRef} type="file" hidden onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      ) : (
        /* File selected — confirm upload with options */
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          padding: isTablet ? '1.5rem' : '2.5rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1.25rem', textAlign: 'center' }}>
            Téléverser un fichier
          </h2>

          {error && (
            <div role="alert" data-testid="error-message" style={{ background: '#FFEBEE', color: '#C62828', padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ background: '#F5F5F5', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>{(file.size / 1048576).toFixed(2)} MB</div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Expiration */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="upload-ttl" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
                Durée d'expiration (jours)
              </label>
              <select
                id="upload-ttl"
                value={ttlDays}
                onChange={e => setTtlDays(Number(e.target.value))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value={1}>1 jour</option>
                <option value={3}>3 jours</option>
                <option value={7}>7 jours (défaut)</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
              </select>
            </div>

            {/* Password (optional) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="upload-password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
                Mot de passe (optionnel)
              </label>
              <input
                id="upload-password"
                type="password"
                placeholder="Laisser vide pour un accès libre"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                🔒 Protège le lien de téléchargement. Si renseigné : min. 8 caractères, 1 majuscule, 1 minuscule, 1 caractère spécial
              </div>
            </div>

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

      <footer style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '2rem',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.75rem',
      }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
