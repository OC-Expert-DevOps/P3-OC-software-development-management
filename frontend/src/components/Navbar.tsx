import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.8rem 2rem',
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{
        color: '#333',
        fontWeight: 700,
        fontSize: '1.2rem',
        textDecoration: 'none',
        letterSpacing: '-0.02em',
      }}>
        DataShare
      </Link>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={{ color: '#333', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              Mon espace
            </Link>
            <Link to="/upload" style={{ color: '#333', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              Téléverser
            </Link>
            <span style={{ color: '#666', fontSize: '0.85rem' }}>{user?.email}</span>
            <button onClick={logout} style={{
              background: '#D4785C',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}>
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: '#333', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              Connexion
            </Link>
            <Link to="/register" style={{
              color: '#fff',
              background: '#D4785C',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
            }}>
              Inscription
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
