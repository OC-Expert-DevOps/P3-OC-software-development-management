import { useState, useRef, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';


const EXPIRATION_OPTIONS = [
  { label: 'Une heure', value: 3600 },
  { label: 'Une journée', value: 86400 },
  { label: 'Une semaine', value: 604800 },
];

const expirationLabel = (ttl: number): string => {
  const opt = EXPIRATION_OPTIONS.find(o => o.value === ttl);
  return opt ? opt.label.toLowerCase() : `${ttl}s`;
};

export default function UploadPage() {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState(86400);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Success state
  const [downloadUrl, setDownloadUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [copied, setCopied] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // Step 1: Upload file
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await api.post('/files/upload', fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const fileData = uploadRes.data?.data || uploadRes.data;
      const fileId = fileData.id;

      // Step 2: Set password if provided
      if (password.trim().length >= 4) {
        await api.put(`/files/${fileId}/password`, { password: password.trim() }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Step 3: Generate download link
      const linkRes = await api.post(`/files/${fileId}/links`, { ttlSeconds }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const linkData = linkRes.data?.data || linkRes.data;
      const linkToken = linkData.token;
      const url = `${window.location.origin}/api/download/${linkToken}`;

      // Set success state
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);
      setDownloadUrl(url);
      setFile(null);
      setPassword('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(downloadUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const resetForm = () => {
    setDownloadUrl('');
    setUploadedFileName('');
    setUploadedFileSize(0);
    setCopied(false);
    setError('');
  };

  // ── Success view ──────────────────────────────────────────────
  if (downloadUrl) {
    return (
      <div style={{
        minHeight: '100vh',
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
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#333', marginBottom: '1.2rem' }}>
            Ajouter un fichier
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🖼️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem', color: '#333', fontWeight: 500 }}>{uploadedFileName}</div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>{formatSize(uploadedFileSize)}</div>
            </div>
          </div>

          <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
            Félicitations, ton fichier sera conservé chez nous pendant {expirationLabel(ttlSeconds)} !
          </p>

          <div style={{
            background: '#f5f5f5',
            borderRadius: '8px',
            padding: '0.7rem 1rem',
            marginBottom: '1.2rem',
            wordBreak: 'break-all',
            fontSize: '0.85rem',
            color: '#D4785C',
          }}>
            {downloadUrl}
          </div>

          <button
            onClick={copyLink}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              color: '#D4785C',
              border: '2px solid #D4785C',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1rem',
            }}
          >
            🔗 {copied ? 'Copié !' : 'Copier le lien'}
          </button>

          <div>
            <button onClick={resetForm} style={{
              background: 'none', border: 'none', color: '#888', fontSize: '0.85rem',
              cursor: 'pointer', textDecoration: 'underline',
            }}>
              Téléverser un autre fichier
            </button>
          </div>
        </div>

        <footer style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
          Copyright DataShare® 2025
        </footer>
      </div>
    );
  }

  // ── Upload form view ──────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
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
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#333', marginBottom: '1.5rem', textAlign: 'center' }}>
          Ajouter un fichier
        </h2>

        <form onSubmit={handleSubmit}>
          {/* File selection */}
          {!file ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #ccc',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '1.2rem',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#D4785C')}
              onMouseOut={e => (e.currentTarget.style.borderColor = '#ccc')}
            >
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Clique pour sélectionner un fichier</p>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1.2rem', padding: '0.8rem', background: '#f9f9f9', borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🖼️</span>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>{file.name.length > 25 ? file.name.slice(0, 22) + '...' : file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{formatSize(file.size)}</div>
                </div>
              </div>
              <button type="button" onClick={() => { setFile(null); fileRef.current?.click(); }} style={{
                background: 'transparent', color: '#D4785C', border: '1px solid #D4785C',
                borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
              }}>
                Changer
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)} />

          {/* Password field */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Optionnel"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '0.7rem', border: '1px solid #ddd',
                borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Expiration dropdown */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#555', fontWeight: 500 }}>
              Expiration
            </label>
            <select
              value={ttlSeconds}
              onChange={e => setTtlSeconds(Number(e.target.value))}
              style={{
                width: '100%', padding: '0.7rem', border: '1px solid #ddd',
                borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                background: 'white', cursor: 'pointer',
              }}
            >
              {EXPIRATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{
              background: '#fee', color: '#c00', padding: '0.7rem',
              borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem',
            }}>❌ {error}</div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              width: '100%',
              padding: '0.7rem',
              background: file ? '#D4785C' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: !file || uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            🔗 {uploading ? 'Envoi en cours...' : 'Téléverser'}
          </button>
        </form>
      </div>

      <footer style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
