import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5rem 1.5rem 2rem',
      position: 'relative',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#333',
        }}>Connexion</h1>

        {error && (
          <div style={{
            background: '#FFEBEE',
            color: '#C62828',
            padding: '0.7rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              placeholder="Saisissez votre email..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Saisissez votre mot de passe..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <Link to="/register" style={{ color: '#D4785C', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
              Créer un compte
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.7rem',
              background: '#F5EBE6',
              color: '#D4785C',
              border: '2px solid #F0D6CC',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>

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
