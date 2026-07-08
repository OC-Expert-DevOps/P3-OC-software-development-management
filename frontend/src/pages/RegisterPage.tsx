import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useIsMobile } from '../hooks/useIsMobile';

export default function RegisterPage() {
  const navigate = useNavigate();
  const isTablet = useIsMobile(768);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Inscription échouée');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 0.9rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isTablet ? '4rem 1rem 1.5rem' : '5rem 1.5rem 2rem',
      position: 'relative',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: isTablet ? '1.5rem' : '2.5rem',
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
        }}>Créer un compte</h1>

        {error && (
          <div role="alert" data-testid="error-message" style={{
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
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Min. 8 caractères, 1 majuscule, 1 spécial"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#666', fontWeight: 500 }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              placeholder="Ressaisissez votre mot de passe..."
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{
                ...inputStyle,
                borderColor: confirmPassword && password !== confirmPassword ? '#F44336' : '#E0E0E0',
              }}
            />
            {confirmPassword && password !== confirmPassword && (
              <div style={{ color: '#F44336', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Les mots de passe ne correspondent pas
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <Link to="/login" style={{ color: '#D4785C', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
              Déjà un compte ? Se connecter
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || (!!confirmPassword && password !== confirmPassword)}
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
            {loading ? 'Inscription...' : 'Créer un compte'}
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
