// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { admins } from '../utils/admins';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Automatically log in if user is saved in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('loggedInUser');
    if (stored) onLogin(stored);
  }, [onLogin]);

  const handleLogin = () => {
    const found = admins.find(
      (a) => a.username === username && a.password === password
    );
    if (found) {
      localStorage.setItem('loggedInUser', username);
      onLogin(username);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Kabitalok Admin Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button onClick={handleLogin} style={styles.button}>
          Login
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6', // bg-gray-100
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF', // white
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827', // gray-900
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 12,
    border: '1px solid #D1D5DB', // gray-300
    borderRadius: 6,
    fontSize: 16,
  },
  error: {
    color: '#DC2626', // red-600
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: '10px 0',
    backgroundColor: '#2563EB', // blue-600
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

// Optional: add a hover effect via a simple inline event
// If you want hover darkening, you can add:
// onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E40AF'}
// onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
