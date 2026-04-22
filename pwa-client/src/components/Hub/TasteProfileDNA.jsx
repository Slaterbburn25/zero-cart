import React from 'react';

export default function TasteProfileDNA({ profile }) {
  if (!profile) return null;

  return (
    <div className="glass-panel" style={{ marginBottom: '2rem', borderTop: '4px solid var(--accent-base)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-hover)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Your Taste Profile
        </h2>
        <span style={{ fontSize: '0.75rem', background: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.4rem 0.8rem', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Synchronized</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700 }}>Household Habits</h4>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6', background: 'var(--bg-color)', padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          {profile.behavioral_summary}
        </p>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h4 style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700 }}>Core Staples</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Array.isArray(profile.staple_ingredients) 
              ? profile.staple_ingredients.map((item, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item}
                  </span>
                ))
              : typeof profile.staple_ingredients === 'string' 
                ? <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{profile.staple_ingredients}</span>
                : <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No staples identified</span>
            }
          </div>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Brand Loyalties</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Array.isArray(profile.brand_loyalties)
              ? profile.brand_loyalties.map((item, i) => (
                  <span key={i} style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-base)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                    {item}
                  </span>
                ))
              : typeof profile.brand_loyalties === 'string'
                ? <span style={{ color: 'var(--accent-base)', fontSize: '0.85rem' }}>{profile.brand_loyalties}</span>
                : <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No loyalties identified</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
