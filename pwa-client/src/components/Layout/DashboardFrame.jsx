import React from 'react';

export default function DashboardFrame({ user, onLogout, children }) {
  return (
    <div className="app-container">
      
      {/* Top Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(25, 30, 33, 0.6)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-base), #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(34, 211, 238, 0.4)' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F1214" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Zero<span style={{color: 'var(--accent-base)'}}>Cart</span></h1>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', display: 'block', marginTop: '-2px' }}>Autonomous Core</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ textAlign: 'right', display: 'none' }} className="user-email-block">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>{user?.email}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--success-color)' }}>Uplink Active</div>
           </div>
           
           <button onClick={onLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
             Disconnect
           </button>
        </div>
      </nav>

      <main>
        {children}
      </main>

    </div>
  );
}
