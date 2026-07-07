import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | string;
  expiresAt: string;
  createdAt: string;
  hasPassword?: boolean;
}

type Filter = 'all' | 'active' | 'expired';

function daysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function expiryLabel(expiresAt: string): string {
  const days = daysRemaining(expiresAt);
  if (days <= 0) return 'Expiré';
  if (days === 1) return 'Expire dans 1 jour';
  return `Expire dans ${days} jours`;
}

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [linkUrl, setLinkUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const getExt = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase().slice(0, 4) : '?';
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Apply filters
  const filteredFiles = files.filter(f => {
    if (filter === 'active') return daysRemaining(f.expiresAt) > 0;
    if (filter === 'expired') return daysRemaining(f.expiresAt) <= 0;
    return true;
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1.1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#D4785C' : 'transparent',
    color: active ? '#fff' : '#999',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
  });

  /* ─── SIDEBAR ─── */
  const sidebar = (
    <div style={{
      width: isMobile ? '100%' : '220px',
      background: 'linear-gradient(180deg, #D4785C 0%, #E8A4A0 50%, #F0C4B8 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: isMobile ? '1.25rem 1.5rem' : '2rem 1.25rem',
      flexShrink: 0,
      ...(isMobile ? { position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100, width: '260px', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' } : {}),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>DataShare</div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        )}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>
        Mes fichiers
      </div>
      <footer style={{ marginTop: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
        Copyright DataShare® 2025
      </footer>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }} />
      )}

      {/* Sidebar: always visible on desktop, toggle on mobile */}
      {isMobile ? (sidebarOpen && sidebar) : sidebar}

      {/* Main content */}
      <div style={{ flex: 1, background: '#FFF8F5', display: 'flex', flexDirection: 'column', minHeight: isMobile ? '100vh' : 'auto', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '0.75rem 1rem' : '1rem 2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#333' }}>☰</button>
            )}
            {isMobile && <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#333' }}>DataShare</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/upload" style={{
              padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
            }}>
              Ajouter des fichiers
            </Link>
            <button data-testid="logout-button" onClick={handleLogout} style={{
              padding: '0.5rem 0.8rem', background: 'transparent', color: '#D4785C', border: 'none', borderRadius: '8px',
              fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap',
            }}>↪ Déconnexion</button>
          </div>
        </div>

        {/* Files section */}
        <div style={{ padding: isMobile ? '0 1rem 2rem' : '0 2rem 2rem', flex: 1, overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '1rem' }}>Mes fichiers</h2>

          {/* Filter tabs */}
          <div style={{ display: 'inline-flex', background: '#F0F0F0', borderRadius: '20px', padding: '3px', gap: '2px', marginBottom: '1.25rem' }}>
            <button style={tabStyle(filter === 'all')} onClick={() => setFilter('all')}>Tous</button>
            <button style={tabStyle(filter === 'active')} onClick={() => setFilter('active')}>Actifs</button>
            <button style={tabStyle(filter === 'expired')} onClick={() => setFilter('expired')}>Expiré</button>
          </div>

          {linkUrl && (
            <div data-testid="link-notification" style={{ background: '#E8F5E9', color: '#2E7D32', padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, wordBreak: 'break-all' }}>
              ✅ Lien copié : {linkUrl}
            </div>
          )}

          {loading ? (
            <p data-testid="loading" style={{ color: '#999', fontSize: '0.9rem' }}>Chargement…</p>
          ) : filteredFiles.length === 0 ? (
            <p data-testid="empty-state" style={{ color: '#999', fontSize: '0.9rem' }}>
              {filter === 'all' ? <>Aucun fichier. <Link to="/upload" style={{ color: '#D4785C' }}>Téléverser</Link></> : 'Aucun fichier dans cette catégorie.'}
            </p>
          ) : (
            filteredFiles.map(f => {
              const days = daysRemaining(f.expiresAt);
              const isExpired = days <= 0;
              return (
                <div key={f.id} data-testid="file-row" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0', borderBottom: '1px solid #F0E8E5',
                  flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '0.5rem' : '0',
                  opacity: isExpired ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div data-testid="file-type-badge" style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      background: '#F0E8E5', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, color: '#C0654A', flexShrink: 0,
                    }}>{getExt(f.originalName)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div data-testid="file-name" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.originalName}</div>
                      <div data-testid="file-expiry" style={{ fontSize: '0.75rem', color: isExpired ? '#E53935' : '#999' }}>{expiryLabel(f.expiresAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, ...(isMobile ? { width: '100%', justifyContent: 'flex-end' } : {}) }}>
                    {f.hasPassword && <span style={{ fontSize: '0.85rem' }}>🔒</span>}
                    <button data-testid="delete-file-button" onClick={() => deleteFile(f.id)} style={{
                      padding: '0.35rem 0.7rem', border: '1px solid #D4785C', borderRadius: '6px',
                      background: 'transparent', color: '#D4785C', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>🗑 Supprimer</button>
                    {!isExpired && (
                      <button data-testid="generate-link-button" onClick={() => generateLink(f.id)} style={{
                        padding: '0.35rem 0.7rem', border: '1px solid #D4785C', borderRadius: '6px',
                        background: 'transparent', color: '#D4785C', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      }}>Accéder →</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
