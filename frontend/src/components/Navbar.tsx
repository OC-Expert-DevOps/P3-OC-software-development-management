import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#1a1a2e', color: '#fff' }}>
      <Link to="/" style={{ color: '#e94560', fontWeight: 'bold', fontSize: '1.4rem', textDecoration: 'none' }}>
        📁 DataShare
      </Link>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/upload" style={{ color: '#fff', textDecoration: 'none' }}>Upload</Link>
            <span style={{ color: '#aaa' }}>{user?.email}</span>
            <button onClick={logout} style={{ background: '#e94560', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
            <Link to="/register" style={{ color: '#e94560', textDecoration: 'none', fontWeight: 'bold' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
