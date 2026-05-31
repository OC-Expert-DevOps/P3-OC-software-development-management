import { useParams } from 'react-router-dom';

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();

  const downloadUrl = `/api/download/${token}`;

  return (
    <div style={{ maxWidth: 500, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1>📥 Download File</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Click the button below to download your file. This link may expire.
      </p>
      <a
        href={downloadUrl}
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          background: '#1a73e8',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 6,
          fontSize: '1.1rem',
          fontWeight: 'bold',
        }}
      >
        ⬇️ Download Now
      </a>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#aaa' }}>
        If the link has expired, ask the file owner for a new one.
      </p>
    </div>
  );
}
