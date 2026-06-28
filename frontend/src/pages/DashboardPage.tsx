import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | string;
  createdAt: string;
}

type Filter = 'all' | 'active' | 'expired';

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [linkUrl, setLinkUrl] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/files');
      setFiles(data.data || data);
    } catch { /* silent */ } finally {
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
    const { data } = await api.post(`/files/${id}/links`, { ttlSeconds: 604800 });
    const token = data.token || data.data?.token;
    const url = `${window.location.origin}/download/${token}`;
    setLinkUrl(url);
    navigator.clipboard?.writeText(url);
  };

  const formatSize = (bytes: number | string) => {
    const n = Number(bytes);
    if (isNaN(n)) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  };

  const getExt = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase().slice(0, 4) : '?';
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#D4785C' : 'transparent',
    color: active ? '#fff' : '#666',
    fontFamily: "'Inter', sans-serif",
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', paddingTop: '60px' }}>
      {/* Left — Upload CTA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <Link to="/upload" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', color: '#fff',
          }}>☁</div>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 500 }}>Tu veux partager un fichier ?</span>
        </Link>
        <footer style={{ marginTop: 'auto', padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
          Copyright DataShare® 2025
        </footer>
      </div>

      {/* Right — Files panel */}
      <div style={{
        width: '480px',
        background: '#fff',
        padding: '2rem',
        overflowY: 'auto',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.05)',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1rem' }}>Mes fichiers</h2>

        {/* Switch tabs */}
        <div style={{ display: 'inline-flex', background: '#F5F5F5', borderRadius: '8px', padding: '3px', gap: '2px', marginBottom: '1.25rem' }}>
          <button style={tabStyle(filter === 'all')} onClick={() => setFilter('all')}>Tous</button>
          <button style={tabStyle(filter === 'active')} onClick={() => setFilter('active')}>Actifs</button>
          <button style={tabStyle(filter === 'expired')} onClick={() => setFilter('expired')}>Expiré</button>
        </div>

        {linkUrl && (
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, wordBreak: 'break-all' }}>
            ✅ Lien copié : {linkUrl}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Chargement…</p>
        ) : files.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Aucun fichier. <Link to="/upload" style={{ color: '#D4785C' }}>Téléverser</Link></p>
        ) : (
          files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 0', borderBottom: '1px solid #F0F0F0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  background: '#E8A4A0', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: '#C0654A', flexShrink: 0,
                }}>{getExt(f.originalName)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.originalName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#999' }}>{formatSize(f.sizeBytes)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => generateLink(f.id)} style={{
                  padding: '0.3rem 0.6rem', border: '1px solid #D4785C', borderRadius: '6px',
                  background: 'transparent', color: '#D4785C', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>Lien</button>
                <button onClick={() => deleteFile(f.id)} style={{
                  padding: '0.3rem 0.6rem', border: '1px solid #F44336', borderRadius: '6px',
                  background: 'transparent', color: '#F44336', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>Supprimer</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
