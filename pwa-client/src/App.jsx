import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronRight, CheckCircle2, BellRing } from 'lucide-react';
import './index.css';

function App() {
  const [basketState, setBasketState] = useState('idle'); // 'idle' | 'building' | 'review' | 'approving' | 'done'
  const [basketData, setBasketData] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedStore, setSelectedStore] = useState('Tesco Blackburn');

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification("ZeroCart", { body: "Push notifications active!" });
      }
    }
  };

  const handleBuildCart = async () => {
    setBasketState('building');
    
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/generate_plan?user_id=1&store_name=${encodeURIComponent(selectedStore)}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBasketData(data.basket_summary);
        setMealPlan(data.meal_plan?.meals);
        setBasketState('review');
        
        if (notificationsEnabled) {
          new Notification('Basket Ready!', { body: `Your ${selectedStore} weekly shop and meals are ready.` });
        }
      } else {
        const errorData = await response.json();
        alert("Error generating cart: " + errorData.detail);
        setBasketState('idle');
      }
    } catch (err) {
      alert("Error connecting to backend");
      setBasketState('idle');
    }
  };

  const handleApprove = async () => {
    setBasketState('approving');
    
    try {
      await fetch(`http://${window.location.hostname}:8000/api/v1/cart/approve?user_id=1&store_name=${encodeURIComponent(selectedStore)}`, {
        method: 'POST'
      });
      setBasketState('done');
      if (notificationsEnabled) {
        new Notification('Cart Approved', { body: 'Playwright agent is now injecting your basket.' });
      }
    } catch(err) {
      setTimeout(() => setBasketState('done'), 1500);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '450px', maxWidth: '95vw' }}>
      
      {!notificationsEnabled && (
        <div className="notification-banner" onClick={enableNotifications} style={{cursor: 'pointer'}}>
          <BellRing size={16} /> Enable Push Notifications for updates
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title">ZeroCart</h1>
        <p className="subtitle">Automated Household Restocking</p>
      </div>

      {/* Store Toggle */}
      {basketState === 'idle' && (
        <div className="store-toggle">
          <div 
            className={`store-option ${selectedStore === 'Tesco Blackburn' ? 'active' : ''}`}
            onClick={() => setSelectedStore('Tesco Blackburn')}
          >
            Tesco
          </div>
          <div 
            className={`store-option ${selectedStore === 'ASDA Blackburn' ? 'active' : ''}`}
            onClick={() => setSelectedStore('ASDA Blackburn')}
          >
            ASDA
          </div>
        </div>
      )}

      {basketState === 'idle' && (
        <button className="btn-primary" onClick={handleBuildCart}>
          <ShoppingBag size={18} /> Build & Plan Week
        </button>
      )}

      {basketState === 'building' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '3rem 0' }}>
          <div className="loader"></div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Math engine computing optimal basket...</p>
        </div>
      )}

      {basketState === 'review' && basketData && (
        <div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-value">£{basketData.total_cost.toFixed(2)}</div>
              <div className="stat-label">Total Cost</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{basketData.total_protein_grams.toFixed(0)}g</div>
              <div className="stat-label">Protein yield</div>
            </div>
          </div>

          {mealPlan && mealPlan.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Generated Meal Plan
              </div>
              <div className="meal-carousel">
                {mealPlan.map((meal, idx) => (
                  <div key={idx} className="meal-card">
                    <div className="meal-day">{meal.day} • {meal.meal_type}</div>
                    <div className="meal-title">{meal.recipe_name}</div>
                    <div className="meal-desc">{meal.instructions}</div>
                    <div className="meal-ing-container">
                      {meal.ingredients_used.slice(0,4).map((ing, i) => (
                        <span key={i} className="meal-ing">{ing.split(' ')[0]}</span> // Just showing first word for compactness
                      ))}
                      {meal.ingredients_used.length > 4 && <span className="meal-ing">+{meal.ingredients_used.length - 4} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button className="btn-success" onClick={handleApprove}>
            Approve & Launch Injector <ChevronRight size={18} />
          </button>
          
          <button style={{ marginTop: '0.75rem', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => setBasketState('idle')}>
            Cancel
          </button>
        </div>
      )}

      {basketState === 'approving' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '3rem 0' }}>
          <div className="loader" style={{ borderColor: 'var(--success-color)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--success-color)', fontWeight: 500 }}>Executing Edge Agent...</p>
        </div>
      )}

      {basketState === 'done' && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <CheckCircle2 size={56} color="var(--success-color)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Agent Deployed</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
            Playwright is commandeering your local Chrome session softly in the background. Check your banking app for the 3D secure approval shortly.
          </p>
          
          <button className="btn-primary" onClick={() => setBasketState('idle')}>
            Complete
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
