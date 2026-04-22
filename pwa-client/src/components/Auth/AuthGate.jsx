import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '../../firebase'; // Assuming correct path to firebase config

export default function AuthGate({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(cred.user);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(cred.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Zero<span style={{color: 'var(--accent-base)'}}>Cart</span></h1>
          <p className="subtitle" style={{ fontSize: '1rem', margin: 0 }}>The Autonomous Grocery Core</p>
        </div>

        <form onSubmit={handleAction} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Transmission Link (Email)</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Authorization Code (Password)</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} 
            />
          </div>
          
          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(255, 0, 0, 0.05)', color: 'red', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(255,0,0,0.2)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.9rem' }}>
            {isLogin ? 'Initiate Link' : 'Register Core'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
          {isLogin ? "Don't have an access crystal? " : "Already established? "}
          <span 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ color: 'var(--accent-base)', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? 'Register' : 'Log In'}
          </span>
        </p>
      </div>
    </div>
  );
}
