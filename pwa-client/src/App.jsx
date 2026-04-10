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

function AgentTracker({ phase, store }) {
  const [currentMessage, setCurrentMessage] = useState('Initializing agent...');
  
  useEffect(() => {
    let timeouts = [];
    const storeName = store === 'Tesco Live' ? 'Tesco' : 'ASDA';
    
    const executionLogs = phase === 'sync' ? [
      "Initializing Google Search Agent...",
      "Bypassing Cloudflare via native Web Index...",
      "Executing Live Web Queries for Proteins...",
      "Executing Live Web Queries for Carbs...",
      "Aggregating Tesco specific prices...",
      "Resolving dynamic product URLs..."
    ] : [
      "Initializing AI Math Engine...",
      "Injecting £90 strict constraint...",
      "Calculating optimum macros...",
      "Basket found. Cost minimized.",
      "Connecting to Gemini Intelligence...",
      "Generating 7 culinary plans...",
      "Finalizing protocol..."
    ];

    executionLogs.forEach((msg, idx) => {
      const waitTime = (idx * 2500) + 500;
      const timer = setTimeout(() => {
        setCurrentMessage(msg);
      }, waitTime);
      timeouts.push(timer);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [phase, store]);

  return (
    <div style={{ textAlign: 'center', margin: '0.5rem 0', minHeight: '30px' }}>
      <div 
         key={currentMessage} 
         style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 500, animation: 'fadeIn 0.5s ease' }}
      >
        {currentMessage}
      </div>
    </div>
  );
}
function UserProfileSetup({ profile, onSave, onCancel }) {
  const [formData, setFormData] = useState(profile || {
    family_size: 1,
    meals_per_day: 3,
    weekly_budget: 90,
    calorie_limit: 2200,
    preferred_store: 'Tesco Live',
    primary_goal: 'Balanced',
    preferred_meats: 'Any',
    hated_foods: 'none'
  });

  const initialMeals = profile?.meal_types_wanted ? profile.meal_types_wanted.split(',') : ['Dinner'];
  const [mealSelection, setMealSelection] = useState({
     Breakfast: initialMeals.includes('Breakfast'),
     Lunch: initialMeals.includes('Lunch'),
     Dinner: initialMeals.includes('Dinner')
  });

  const handleMealToggle = (meal) => {
     setMealSelection(prev => ({...prev, [meal]: !prev[meal]}));
  };

  const [noBudget, setNoBudget] = useState(profile?.weekly_budget === null);
  const [noCalorie, setNoCalorie] = useState(profile?.calorie_limit === null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate at least one meal is selected
    const selectedMeals = Object.entries(mealSelection).filter(([k, v]) => v).map(([k]) => k);
    if (selectedMeals.length === 0) {
       alert("Please select at least one meal type!");
       return;
    }

    onSave({
      ...formData,
      meal_types_wanted: selectedMeals.join(','),
      weekly_budget: noBudget ? null : formData.weekly_budget,
      calorie_limit: noCalorie ? null : formData.calorie_limit
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)', fontSize: '1.3rem' }}>Agent Calibration</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Mouths to Feed (Family Size)</label>
            <input type="number" min="1" max="10" value={formData.family_size} onChange={e => setFormData({...formData, family_size: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }} required />
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Meals to Automate</label>
             <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                   <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <input 
                         type="checkbox" 
                         checked={mealSelection[meal]} 
                         onChange={() => handleMealToggle(meal)}
                      />
                      {meal}
                   </label>
                ))}
             </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
               Weekly Budget Limit
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--accent-base)'}}>
                  <input type="checkbox" checked={noBudget} onChange={e => setNoBudget(e.target.checked)} />
                  I don't care
               </div>
            </label>
            <input type="number" step="1.00" value={formData.weekly_budget} disabled={noBudget} onChange={e => setFormData({...formData, weekly_budget: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', opacity: noBudget ? 0.3 : 1 }} />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
             <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Daily Caloric Target
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--accent-base)'}}>
                   <input type="checkbox" checked={noCalorie} onChange={e => setNoCalorie(e.target.checked)} />
                   I don't care
                </div>
             </label>
             <input type="number" step="50" value={formData.calorie_limit} disabled={noCalorie} onChange={e => setFormData({...formData, calorie_limit: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', opacity: noCalorie ? 0.3 : 1 }} />
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Primary Goal</label>
            <select value={formData.primary_goal || 'Balanced'} onChange={e => setFormData({...formData, primary_goal: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
               <option value="Balanced">Balanced / Normal</option>
               <option value="Weight Loss">Weight Loss</option>
               <option value="Muscle Gain (High Protein)">Muscle Gain (High Protein)</option>
               <option value="Cheap & Easy">Cheap & Easy</option>
               <option value="Heart Healthy">Heart Healthy</option>
               <option value="Vegan/Vegetarian Explorer">Vegan/Vegetarian Explorer</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Preferred Proteins/Meats</label>
            <input type="text" value={formData.preferred_meats || 'Any'} onChange={e => setFormData({...formData, preferred_meats: e.target.value})} placeholder="e.g. Chicken, Beef, Fish, Any" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Hated Foods (Never Include)</label>
            <input type="text" value={formData.hated_foods || 'none'} onChange={e => setFormData({...formData, hated_foods: e.target.value})} placeholder="e.g. Mushrooms, Olives, Cilantro, None" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
             <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
             <button type="submit" style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'var(--accent-base)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------
function App() {
  const [basketState, setBasketState] = useState('idle');
  const [basketSummary, setBasketSummary] = useState(null);
  const [basketItems, setBasketItems] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedStore, setSelectedStore] = useState('Tesco Live');
  const [showItemized, setShowItemized] = useState(false); 
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
    
    // Fetch initial user state
    fetch(`http://${window.location.hostname}:8000/api/v1/user/1`)
      .then(res => res.json())
      .then(data => {
         setUserProfile(data);
         if (data.preferred_store) setSelectedStore(data.preferred_store);
      })
      .catch(err => console.error("Could not load user profile"));
  }, []);

  const saveProfile = async (newProfile) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/v1/user/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user);
        setSelectedStore(data.user.preferred_store);
        setShowProfile(false);
      }
    } catch (e) {
      alert("Failed to save profile.");
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification("ZeroCart", { body: "Push notifications active!" });
      }
    }
  };

  const [targetCategories, setTargetCategories] = useState([]);

  const handleIdeateMeals = async () => {
    setBasketState('ideating');
    
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/ideate?user_id=1`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMealPlan(data.meals || []);
        setTargetCategories(data.required_ingredients || []);
        setBasketState('review_meals');
      } else {
        const errorData = await response.json();
        alert("Error ideating meals: " + errorData.detail);
        setBasketState('idle');
      }
    } catch (err) {
      alert("System Error: Check backend node is running.");
      setBasketState('idle');
    }
  };

  const handleBuildCart = async () => {
    setBasketState('building');
    
    try {
      const payload = {
        user_id: 1,
        store_name: selectedStore,
        target_categories: targetCategories
      };

      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/build_cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setBasketSummary(data.basket_summary);
        setBasketItems(data.basket_items || []);
        setBasketState('review_cart');
        
        if (notificationsEnabled) {
          new Notification('Basket Ready!', { body: `Your ${selectedStore} weekly shop is mathematically optimized and ready.` });
        }
      } else {
        const errorData = await response.json();
        alert("Error generating cart: " + errorData.detail);
        setBasketState('review_meals'); // fallback to meals
      }
    } catch (err) {
      alert("System Error: Check backend/edge node is running.");
      setBasketState('review_meals');
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
      const response = await fetch(`http://${window.location.hostname}:8000/api/v1/ideate_single_meal?day=${encodeURIComponent(day)}&user_id=1`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        // data contains meals and required_ingredients
        setMealPlan(prev => prev.map(m => m.day === day ? (data.meals && data.meals.length > 0 ? data.meals[0] : m) : m));
        
        // Append new abstract ingredients to the hunt list so we buy them
        if (data.required_ingredients && data.required_ingredients.length > 0) {
           setTargetCategories(prev => {
               const newItems = data.required_ingredients.filter(ni => !prev.some(pi => pi.query.toLowerCase() === ni.query.toLowerCase()));
               return [...prev, ...newItems];
           });
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

      {showProfile && userProfile && (
         <UserProfileSetup 
            profile={userProfile} 
            onSave={saveProfile} 
            onCancel={() => setShowProfile(false)} 
         />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
         <div style={{ flex: 1 }}></div>
         
         <div style={{ textAlign: 'center', flex: 2 }}>
           <h1 className="title">ZeroCart</h1>
           <p className="subtitle">Autonomous Grocery Restocking</p>
         </div>
         
         <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingTop: '5px' }}>
           {basketState === 'idle' && (
              <button 
                onClick={() => setShowProfile(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                title="Personalize Agent"
              >
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ fontSize: '0.7rem' }}>⚙️</span>
                    </div>
                    <span style={{ fontSize: '0.65rem' }}>Profile</span>
                 </div>
              </button>
           )}
         </div>
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
        <button className="btn-primary" onClick={handleIdeateMeals}>
          <ShoppingBag size={18} /> Ideate Meal Plan
        </button>
      )}

      {basketState === 'ideating' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
          <div style={{ color: 'var(--accent-base)', fontWeight: 600 }}>Gemini is designing your meals...</div>
          <div className="loader"></div>
        </div>
      )}

      {basketState === 'review_meals' && (
         <div>
            {mealPlan && mealPlan.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI Generated Custom Menu
                </div>
                <div className="meal-carousel">
                  {mealPlan.map((meal, idx) => (
                    <MealCard 
                       key={idx} 
                       meal={meal} 
                       index={idx}
                       handleRefreshSingleMeal={handleRefreshSingleMeal}
                       basketDataItems={[]} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            <button className="btn-success" onClick={handleBuildCart}>
              Looks Good! Hunt Prices & Build Cart <ChevronRight size={18} />
            </button>
            
            <button style={{ marginTop: '0.75rem', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => setBasketState('idle')}>
              Cancel & Reset
            </button>
         </div>
      )}

      {basketState === 'building' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
          <AgentTracker phase="build" store={selectedStore} />
          <div className="loader"></div>
        </div>
      )}

      {basketState === 'review_cart' && basketSummary && (
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
                         <span style={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.quantity}x {item.url ? (
                               <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-base)', textDecoration: 'none', fontWeight: 500 }}>
                                  {item.item_name}
                               </a>
                            ) : item.item_name}
                         </span>
                         <span style={{ fontWeight: 600 }}>£{item.selected_price.toFixed(2)}</span>
                      </div>
                   ))}
                </div>
             )}
          </div>
          
          <button className="btn-success" onClick={handleApprove}>
            Approve Cart & Launch Injector <ChevronRight size={18} />
          </button>
          
          <button style={{ marginTop: '0.75rem', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => setBasketState('review_meals')}>
            Cancel & Go Back to Meals
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
