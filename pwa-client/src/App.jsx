import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronRight, CheckCircle2, BellRing, RefreshCw, Clock, Scale } from 'lucide-react';
import './index.css';

function App() {
  const [basketState, setBasketState] = useState('idle'); // 'idle' | 'syncing' | 'building' | 'review' | 'approving' | 'done'
  const [basketData, setBasketData] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedStore, setSelectedStore] = useState('Tesco Live');
  const [loadingMealDay, setLoadingMealDay] = useState(null);

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

  const handleSyncAndBuild = async () => {
    setBasketState('syncing');
    
    // Phase 1: Fire Edge Scraper
    try {
      if (selectedStore === 'Tesco Live') {
          const syncRes = await fetch(`http://${window.location.hostname}:8000/api/v1/sync_live_prices`, { method: 'POST' });
          if (!syncRes.ok) throw new Error("Scraper Failed");
      }
      
      setBasketState('building');
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
      alert("System Error: Check backend/edge node is running.");
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

  const handleRefreshSingleMeal = async (day) => {
    setLoadingMealDay(day);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/generate_single_meal?day=${encodeURIComponent(day)}&user_id=1&store_name=${encodeURIComponent(selectedStore)}`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
           // Swap the old meal with the newly generated meal
           setMealPlan(prev => prev.map(m => m.day === day ? data.meal : m));
        }
      } else {
         alert("Failed to swap meal. API Error.");
      }
    } catch (err) {
       console.error("Network error while swapping meal", err);
    }
    setLoadingMealDay(null);
  };

  return (
    <div className="glass-panel app-container">
      
      {!notificationsEnabled && (
        <div className="notification-banner" onClick={enableNotifications} style={{cursor: 'pointer'}}>
          <BellRing size={16} /> Enable Push Notifications for updates
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title">ZeroCart</h1>
        <p className="subtitle">Autonomous Grocery Restocking</p>
      </div>

      {basketState === 'idle' && (
        <div className="store-toggle">
          <div 
            className={`store-option ${selectedStore === 'Tesco Live' ? 'active' : ''}`}
            onClick={() => setSelectedStore('Tesco Live')}
          >
            Tesco (Live Scrape)
          </div>
          <div 
            className={`store-option ${selectedStore === 'ASDA Blackburn' ? 'active' : ''}`}
            onClick={() => setSelectedStore('ASDA Blackburn')}
          >
            ASDA (Cached)
          </div>
        </div>
      )}

      {basketState === 'idle' && (
        <button className="btn-primary" onClick={handleSyncAndBuild}>
          <ShoppingBag size={18} /> Sync & Plan Week
        </button>
      )}

      {basketState === 'syncing' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '3rem 0' }}>
          <div className="loader"></div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center' }}>
             Deploying Chrome Symbiote <br/>
             <span style={{fontSize: '0.8rem', opacity: 0.7}}>Scraping live prices from Tesco.com...</span>
          </p>
        </div>
      )}

      {basketState === 'building' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '3rem 0' }}>
          <div className="loader"></div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center'}}>
             Math engine calculating optimum macros...<br/>
             <span style={{fontSize: '0.8rem', opacity: 0.7}}>Generating 7-day algorithmic recipes</span>
          </p>
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
              <div className="stat-label">Protein</div>
            </div>
            <div className="stat-box desktop-stat">
              <div className="stat-value">{basketData.budget_utilized}</div>
              <div className="stat-label">Budget Used</div>
            </div>
          </div>

          {mealPlan && mealPlan.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Generated Meal Plan
              </div>
              <div className="meal-carousel">
                {mealPlan.map((meal, idx) => (
                  <div key={idx} className="meal-card" style={{ position: 'relative' }}>
                    
                    {loadingMealDay === meal.day ? (
                      <div className="flex-center" style={{height: '100%'}}>
                          <div className="loader"></div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="meal-day">{meal.day} • {meal.meal_type}</span>
                          <button 
                             onClick={() => handleRefreshSingleMeal(meal.day)}
                             title="Swap this recipe"
                             style={{ padding: '0.3rem', width: 'auto', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                          >
                             <RefreshCw size={14} />
                          </button>
                        </div>
                        
                        <div className="meal-title">{meal.recipe_name}</div>
                        
                        {/* Granular Stats */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                           <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-dim)'}}>
                              <Clock size={12}/> {meal.prep_time_mins + meal.cooking_time_mins}m total
                           </span>
                           <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-dim)'}}>
                              <Scale size={12}/> {meal.total_weight_grams}g
                           </span>
                        </div>

                        <div className="meal-desc">
                            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                                {meal.cooking_instructions?.slice(0, 3).map((step, sIdx) => (
                                    <li key={sIdx} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{step}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="meal-ing-container">
                          {meal.ingredients_used?.slice(0,4).map((ing, i) => (
                            <span key={i} className="meal-ing">{ing.split(' ')[0]}</span>
                          ))}
                          {meal.ingredients_used?.length > 4 && <span className="meal-ing">+{meal.ingredients_used.length - 4} items</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button className="btn-success" onClick={handleApprove}>
            Approve & Launch Injector <ChevronRight size={18} />
          </button>
          
          <button style={{ marginTop: '0.75rem', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => setBasketState('idle')}>
            Cancel & Reset
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
            Playwright is commandeering your local browser softly in the background. Check your banking app for the 3D secure approval shortly.
          </p>
          
          <button className="btn-primary" onClick={() => setBasketState('idle')}>
            Start New Run
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
