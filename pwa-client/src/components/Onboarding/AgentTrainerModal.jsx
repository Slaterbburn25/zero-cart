import React, { useState, useEffect, useRef } from 'react';

export default function AgentTrainerModal({ show, onSubmit, isTraining, logs = [] }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '90%', textAlign: 'center', border: '1px solid var(--accent-base)', boxShadow: 'var(--accent-glow)' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>🤖 Agent Deployment</h2>
          
          {!isTraining && logs.length === 0 && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid var(--border-color)' }}>
                <p style={{ color: 'var(--text-dim)', marginBottom: '0.8rem', lineHeight: '1.5', fontSize: '0.9rem' }}>
                    Please provide your grocery store credentials. The headless cloud scraper will use these to log in securely and extract your Taste Profile.
                </p>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ boxSizing: 'border-box', width: '100%', padding: '0.8rem', marginBottom: '1rem', background: '#121212', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ boxSizing: 'border-box', width: '100%', padding: '0.8rem', marginBottom: '1rem', background: '#121212', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
          )}

          {logs.length > 0 && (
             <div style={{ 
                 background: '#0a0a0a', 
                 border: '1px solid #333', 
                 borderRadius: '8px', 
                 padding: '1rem', 
                 marginBottom: '1.5rem', 
                 textAlign: 'left',
                 fontFamily: 'monospace',
                 fontSize: '0.85rem',
                 height: '200px',
                 overflowY: 'auto',
                 boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
             }}>
                 {logs.map((log, i) => (
                     <div key={i} style={{ 
                         color: log.includes('[ERROR]') ? '#ff5555' : (log.includes('🟢') || log.includes('success') || log.includes('Backend')) ? '#55ff55' : '#00e5ff', 
                         marginBottom: '0.4rem',
                         lineHeight: '1.4',
                         wordBreak: 'break-all'
                     }}>
                         {log}
                     </div>
                 ))}
                 <div ref={logsEndRef} />
             </div>
          )}

          {!isTraining && logs.length === 0 && (
              <button 
                 onClick={() => onSubmit(email, password)} 
                 disabled={!email || !password}
                 style={{ boxSizing: 'border-box', width: '100%', padding: '1.1rem', background: 'var(--accent-base)', color: '#121212', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: (!email || !password) ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(34, 211, 238, 0.3)', opacity: (!email || !password) ? 0.6 : 1 }}
              >
                  Deploy Agent
              </button>
          )}
          
          {isTraining && logs.length === 0 && (
             <button disabled style={{ boxSizing: 'border-box', width: '100%', padding: '1.1rem', background: 'var(--accent-base)', color: '#121212', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, opacity: 0.6 }}>
                  Connecting to Edge Scraper...
             </button>
          )}
      </div>
    </div>
  );
}
