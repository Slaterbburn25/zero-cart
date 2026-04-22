import React, { useState } from 'react';

export default function OnboardingWorkflow({ storePreference, onSaveStore, onTrainAgent, isTraining }) {
  const [selectedStore, setSelectedStore] = useState(storePreference || 'Iceland Live');

  const handleSave = () => {
    onSaveStore(selectedStore);
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="title" style={{ fontSize: '2rem' }}>Core Initialization</h2>
          <p className="subtitle">Set your operating parameters before deploying the AI.</p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Supply Chain Origin</h3>
          
          <div className="store-toggle">

            <div 
              className={`store-option ${selectedStore === 'Iceland Live' ? 'active' : ''}`}
              onClick={() => setSelectedStore('Iceland Live')}
            >
              Iceland (Beta)
            </div>
          </div>
          
          <button onClick={handleSave} className="btn-primary" style={{ padding: '0.8rem', background: '#334155' }}>
            Lock Supplier
          </button>
        </div>

        <div style={{ padding: '1.5rem', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--accent-base)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🧠</span> 2. Neural Calibration
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: '1.5' }}>
            The AI Agent must be trained on your historical consumption data before it is permitted to autonomously purchase organics.
          </p>
          
          <button 
             type="button" 
             onClick={onTrainAgent} 
             disabled={isTraining} 
             style={{ 
               width: '100%', 
               padding: '1rem', 
               borderRadius: '8px', 
               border: '1px solid var(--accent-base)', 
               background: isTraining ? 'transparent' : 'var(--accent-light)', 
               color: isTraining ? 'var(--text-dim)' : 'var(--accent-base)', 
               cursor: isTraining ? 'not-allowed' : 'pointer', 
               fontWeight: 700 
             }}
          >
             {isTraining ? 'Analyzing Receipt Vectors...' : 'DEPLOY EDGE SCRAPER'}
          </button>
        </div>

      </div>
    </div>
  );
}
