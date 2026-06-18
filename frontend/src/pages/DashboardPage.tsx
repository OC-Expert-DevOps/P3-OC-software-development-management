import { useState, useEffect } from 'react';
import api from '../api/client';

const gradientBg = 'linear-gradient(135deg, #D4785C 0%, #E8A4A0 50%, #F0C4B8 100%)';

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | string;
  createdAt: string;
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/files');
      setFiles(data.data || data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const deleteFile = async (id: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await api.delete(`/files/${id}`);
    fetchFiles();
  };

  const generateLink = async (id: string) => {
    const { data } = await api.post(`/files/${id}/links`, { ttlSeconds: 86400 });
    const token = data.token || data.data?.token;
    const url = `${window.location.origin}/api/download/${token}`;
    setLinkUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: gradientBg,
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <h1 style={{ color: '#333', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          Mon espace
        </h1>

        {linkUrl && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            wordBreak: 'break-all',
            fontSize: '0.9rem',
            color: '#2a7',
          }}>
            ✅ Lien copié ! <a href={linkUrl} target="_blank" rel="noreferrer" style={{ color: '#D4785C' }}>{linkUrl}</a>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Chargement...</p>
        ) : files.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#888',
          }}>
            <p>Aucun fichier pour le moment.</p>
            <a href="/upload" style={{ color: '#D4785C', textDecoration: 'none', fontWeight: 500 }}>
              Téléverser votre premier fichier
            </a>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem 1rem', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>Nom</th>
                  <th style={{ padding: '0.8rem 0.5rem', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>Type</th>
                  <th style={{ padding: '0.8rem 0.5rem', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>Taille</th>
                  <th style={{ padding: '0.8rem 0.5rem', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>Date</th>
                  <th style={{ padding: '0.8rem 0.5rem', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.9rem' }}>{f.originalName}</td>
                    <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.85rem', color: '#777' }}>{f.mimeType}</td>
                    <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.85rem', color: '#777' }}>{formatSize(Number(f.sizeBytes))}</td>
                    <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.85rem', color: '#777' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '0.7rem 0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => generateLink(f.id)} style={{
                        background: '#D4785C', color: '#fff', border: 'none',
                        padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 500,
                      }}>🔗 Lien</button>
                      <button onClick={() => deleteFile(f.id)} style={{
                        background: '#e94560', color: '#fff', border: 'none',
                        padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 500,
                      }}>🗑️ Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', marginTop: '3rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );
}
