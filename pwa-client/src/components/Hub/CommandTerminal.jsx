import React, { useState } from 'react';

export default function CommandTerminal({ onDeploy, isBuilding }) {
  const [budget, setBudget] = useState(80);
  const [cadence, setCadence] = useState('shop_now'); // 'shop_now', 'fridays', 'monthly'

  return (
    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-base)' }}></div>
      
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>
        Shopping Preferences
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Budget Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Maximum Budget</label>
            <span style={{ color: 'var(--accent-base)', fontWeight: 'bold', fontSize: '1.1rem' }}>£{budget}</span>
          </div>
          <input 
             type="range" 
             min="30" max="250" step="5" 
             value={budget} 
             onChange={(e) => setBudget(e.target.value)}
             style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-base)' }}
          />
        </div>

        {/* Cadence Selector */}
        <div>
          <label style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.5rem' }}>Shopping Cadence</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div 
               onClick={() => setCadence('shop_now')}
               style={{ padding: '0.8rem', textAlign: 'center', background: cadence === 'shop_now' ? 'var(--accent-light)' : 'rgba(0,0,0,0.02)', color: cadence === 'shop_now' ? 'var(--accent-hover)' : 'var(--text-dim)', border: cadence === 'shop_now' ? '1px solid var(--accent-base)' : '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease', fontWeight: cadence === 'shop_now' ? 600 : 400 }}
            >
              Shop Now
            </div>
            <div 
               onClick={() => setCadence('fridays')}
               style={{ padding: '0.8rem', textAlign: 'center', background: cadence === 'fridays' ? 'var(--accent-light)' : 'rgba(0,0,0,0.02)', color: cadence === 'fridays' ? 'var(--accent-hover)' : 'var(--text-dim)', border: cadence === 'fridays' ? '1px solid var(--accent-base)' : '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease', fontWeight: cadence === 'fridays' ? 600 : 400 }}
            >
              Every Friday
            </div>
            <div 
               onClick={() => setCadence('monthly')}
               style={{ padding: '0.8rem', textAlign: 'center', background: cadence === 'monthly' ? 'var(--accent-light)' : 'rgba(0,0,0,0.02)', color: cadence === 'monthly' ? 'var(--accent-hover)' : 'var(--text-dim)', border: cadence === 'monthly' ? '1px solid var(--accent-base)' : '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease', fontWeight: cadence === 'monthly' ? 600 : 400 }}
            >
              Monthly
            </div>
          </div>
        </div>

        {/* Execution Trigger */}
        <div style={{ marginTop: '1rem' }}>
           <button 
              onClick={() => onDeploy(budget, cadence)} 
              disabled={isBuilding}
              className="btn-success"
              style={{ padding: '1.2rem', fontSize: '1.1rem', opacity: isBuilding ? 0.7 : 1, cursor: isBuilding ? 'not-allowed' : 'pointer' }}
           >
              {isBuilding ? 'Gathering your groceries...' : '🛒 Build My Cart'}
           </button>
           <p style={{ textAlign: 'center', margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
             Gemini will strictly adhere to your Dietary DNA limits.
           </p>
        </div>

      </div>
    </div>
  );
}
