import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{
        color: '#333',
        fontWeight: 700,
        fontSize: '1.25rem',
        textDecoration: 'none',
        letterSpacing: '-0.02em',
        fontFamily: "'Inter', sans-serif",
      }}>
        DataShare
      </Link>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              border: '2px solid #333',
              borderRadius: '8px',
              color: '#333',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
            }}>
              Mon espace
            </Link>
            <button onClick={logout} style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              border: '2px solid #333',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}>
              Se déconnecter
            </button>
          </>
        ) : (
          <Link to="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            border: '2px solid #333',
            borderRadius: '8px',
            color: '#333',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: 'transparent',
          }}>
            Se connecter
          </Link>
        )}
      </div>
    </nav>
  );
}
