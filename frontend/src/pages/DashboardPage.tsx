import { useState, useEffect } from 'react';
import api from '../api/client';

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
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
    if (!confirm('Delete this file?')) return;
    await api.delete(`/files/${id}`);
    fetchFiles();
  };

  const generateLink = async (id: string) => {
    const { data } = await api.post(`/files/${id}/links`, { expiresInSeconds: 86400 });
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
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>📂 My Files</h1>
      {linkUrl && (
        <div style={{ background: '#e8f5e9', padding: '0.8rem', borderRadius: 4, marginBottom: '1rem', wordBreak: 'break-all' }}>
          ✅ Download link copied! <a href={linkUrl} target="_blank" rel="noreferrer">{linkUrl}</a>
        </div>
      )}
      {loading ? <p>Loading...</p> : files.length === 0 ? (
        <p style={{ color: '#888' }}>No files yet. <a href="/upload">Upload your first file</a></p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.6rem' }}>{f.originalName}</td>
                <td>{f.mimeType}</td>
                <td>{formatSize(f.size)}</td>
                <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => generateLink(f.id)}
                    style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: 4, cursor: 'pointer' }}>
                    🔗 Link
                  </button>
                  <button onClick={() => deleteFile(f.id)}
                    style={{ background: '#e94560', color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: 4, cursor: 'pointer' }}>
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
