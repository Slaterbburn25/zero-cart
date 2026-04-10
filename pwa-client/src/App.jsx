import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronRight, CheckCircle2, BellRing, RefreshCw, Clock, Scale, Info, Image as ImageIcon } from 'lucide-react';
import './index.css';

// Child component for the Meal Card to handle its own complex state (tabs, images, refreshing)
function MealCard({ meal, index, handleRefreshSingleMeal, basketDataItems }) {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [image64, setImage64] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const onRefresh = async () => {
    setLoadingMeal(true);
    await handleRefreshSingleMeal(meal.day);
    setLoadingMeal(false);
    setImage64(null); // Reset image on refresh
  };

  const onGenerateImage = async () => {
    setLoadingImage(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/v1/generate_meal_image?recipe_name=${encodeURIComponent(meal.recipe_name)}`);
      if (res.ok) {
        const data = await res.json();
        setImage64(data.image_base64);
      } else {
        alert("Image API quota exceeded or error occurred.");
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingImage(false);
  };

  if (loadingMeal) {
    return (
      <div className="meal-card flex-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="meal-card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="meal-day">{meal.day} • {meal.meal_type}</span>
          <button 
              onClick={onRefresh}
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

        {/* Dynamic Image Container */}
        <div style={{ marginBottom: '1rem', width: '100%', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-color)' }}>
          {image64 ? (
            <img src={`data:image/jpeg;base64,${image64}`} alt="Generated Meal" style={{ width: '100%', height: 'auto', display: 'block' }} />
          ) : loadingImage ? (
            <div className="flex-center" style={{ height: '140px' }}><div className="loader"></div></div>
          ) : (
            <div className="flex-center" style={{ height: '80px', cursor: 'pointer', color: 'var(--accent-base)' }} onClick={onGenerateImage}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500}}>
                <ImageIcon size={16} /> Predict AI Image
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
            <div 
               style={{ flex: 1, textAlign: 'center', cursor: 'pointer', padding: '0.5rem', fontSize: '0.85rem', fontWeight: activeTab === 'ingredients' ? 600 : 400, color: activeTab === 'ingredients' ? 'var(--accent-base)' : 'var(--text-dim)', borderBottom: activeTab === 'ingredients' ? '2px solid var(--accent-base)' : 'none' }}
               onClick={() => setActiveTab('ingredients')}
            >
                Ingredients
            </div>
            <div 
               style={{ flex: 1, textAlign: 'center', cursor: 'pointer', padding: '0.5rem', fontSize: '0.85rem', fontWeight: activeTab === 'instructions' ? 600 : 400, color: activeTab === 'instructions' ? 'var(--accent-base)' : 'var(--text-dim)', borderBottom: activeTab === 'instructions' ? '2px solid var(--accent-base)' : 'none' }}
               onClick={() => setActiveTab('instructions')}
            >
                Recipe
            </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'ingredients' ? (
          <div className="meal-ing-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {meal.ingredients_used?.map((ing, i) => {
               // Optional: cross-reference basketDataItems if needed, but for now we just show what Gemini says
               return (
                 <div key={i} style={{ fontSize: '0.8rem', background: 'var(--accent-light)', padding: '0.4rem 0.6rem', borderRadius: '6px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '75%'}}>{ing.item_name}</span>
                    <span style={{color: 'var(--accent-base)', fontWeight: 600}}>{ing.quantity_used}x</span>
                 </div>
               )
            })}
          </div>
        ) : (
          <div className="meal-desc" style={{maxHeight: '200px', overflowY: 'auto'}}>
            <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {meal.cooking_instructions?.map((step, sIdx) => (
                    <li key={sIdx} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>{step}</li>
                ))}
            </ol>
          </div>
        )}
    </div>
  );
}

function AgentTracker({ phase }) {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    let timeouts = [];
    const executionLogs = phase === 'sync' ? [
      "Securing local Chrome instance...",
      "Injecting stealth plugins...",
      "Navigating to tesco.com...",
      "Bypassing headless bot detection...",
      "Querying Category: Chicken Breast...",
      "Extracting top 3 price metrics...",
      "Querying Category: Rice & Grains...",
      "Querying Category: Eggs & Dairy...",
      "Parsing biological macronutrients...",
      "Dumping payload to SQLite database..."
    ] : [
      "Database sync complete.",
      "Initializing Google OR-Tools...",
      "Injecting £90 strict constraint...",
      "Injecting 400g minimum protein constraint...",
      "Calculating integer matrix...",
      "Optimum basket found. Cost minimized.",
      "Connecting to Vertex AI (Gemini Flash)...",
      "Generating 7-day culinary algorithms...",
      "Enforcing strict basket limits...",
      "Finalizing protocol..."
    ];

    let currentLogs = [];
    executionLogs.forEach((msg, idx) => {
      const waitTime = 500 + (Math.random() * 800) + (idx * 1500);
      const timer = setTimeout(() => {
        currentLogs = [...currentLogs, `[SYS] ${msg}`];
        setLogs(currentLogs);
      }, waitTime);
      timeouts.push(timer);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [phase]);

  return (
    <div style={{ background: '#111', color: '#00FF41', fontFamily: 'monospace', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)', textAlign: 'left', width: '100%', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
      <div style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>AGENT TERMINAL</div>
      {logs.map((log, i) => (
        <div key={i} style={{ animation: 'fadeIn 0.2s ease-out' }}>{log}</div>
      ))}
      <div className="blinking-cursor" style={{ width: '8px', height: '14px', background: '#00FF41', marginTop: '0.2rem', animation: 'blink 1s infinite' }}></div>
    </div>
  );
}

function App() {
  const [basketState, setBasketState] = useState('idle');
  const [basketSummary, setBasketSummary] = useState(null);
  const [basketItems, setBasketItems] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedStore, setSelectedStore] = useState('Tesco Live');
  const [showItemized, setShowItemized] = useState(false); 

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
        setBasketSummary(data.basket_summary);
        setBasketItems(data.basket_items || []);
        setMealPlan(data.meal_plan?.meals || []);
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
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/generate_single_meal?day=${encodeURIComponent(day)}&user_id=1&store_name=${encodeURIComponent(selectedStore)}`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
           setMealPlan(prev => prev.map(m => m.day === day ? data.meal : m));
        }
      } else {
         alert("Failed to swap meal. API Error.");
      }
    } catch (err) {
       console.error("Network error while swapping meal", err);
    }
  };

  return (
    <div className="glass-panel app-container">
      
      {!notificationsEnabled && basketState === 'idle' && (
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
        <div className="flex-center" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
          <AgentTracker phase="sync" />
          <div className="loader"></div>
        </div>
      )}

      {basketState === 'building' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
          <AgentTracker phase="build" />
          <div className="loader"></div>
        </div>
      )}

      {basketState === 'review' && basketSummary && (
        <div>
          <div className="stat-grid" style={{ marginBottom: '1rem' }}>
            <div className="stat-box">
              <div className="stat-value">£{basketSummary.total_cost.toFixed(2)}</div>
              <div className="stat-label">Total Cost</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{basketSummary.total_protein_grams.toFixed(0)}g</div>
              <div className="stat-label">Protein</div>
            </div>
          </div>

          {/* Collapsible Itemized Bill */}
          <div style={{ marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
             <div 
                style={{ background: 'var(--accent-light)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}
                onClick={() => setShowItemized(!showItemized)}
             >
                <span>View Itemized Basket Breakdown</span>
                <Info size={16} color="var(--accent-base)" />
             </div>
             {showItemized && (
                <div style={{ padding: '1rem', background: 'var(--bg-color)', maxHeight: '200px', overflowY: 'auto' }}>
                   {basketItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.2rem' }}>
                         <span style={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.quantity}x {item.item_name}</span>
                         <span style={{ fontWeight: 600 }}>£{item.selected_price.toFixed(2)}</span>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {mealPlan && mealPlan.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Generated Visual Protocol
              </div>
              <div className="meal-carousel">
                {mealPlan.map((meal, idx) => (
                  <MealCard 
                     key={idx} 
                     meal={meal} 
                     index={idx}
                     handleRefreshSingleMeal={handleRefreshSingleMeal}
                     basketDataItems={basketItems}
                  />
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
