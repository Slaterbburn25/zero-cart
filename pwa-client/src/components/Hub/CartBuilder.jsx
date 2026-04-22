import React from 'react';

export default function CartBuilder({ mealPlan, onClear }) {
  if (!mealPlan) return null;

  return (
    <div style={{ padding: '1rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <div>
            <h2 className="title" style={{ fontSize: '2rem', textAlign: 'left', margin: 0 }}>Mission Report</h2>
            <p className="subtitle" style={{ textAlign: 'left', margin: 0, marginTop: '0.25rem' }}>AI Autonomous Shopping Cart generated.</p>
         </div>
         <button onClick={onClear} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', width: 'auto', borderRadius: '8px', color: 'var(--text-dim)' }}>
           Dismiss
         </button>
      </div>

      {mealPlan.days && (
        <>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Weekly Matrix (Ideation)</h3>
          <div className="meal-carousel">
            {mealPlan.days.map((day, idx) => (
              <div key={idx} className="meal-card" style={{ background: 'var(--surface-color)', borderColor: 'var(--border-color)' }}>
                <div className="meal-day">Day {day.day_number} &middot; {day.meal_type}</div>
                <div className="meal-title" style={{ color: 'var(--text-main)' }}>{day.recipe_name}</div>
                <div className="meal-desc">{day.description}</div>
                <div className="meal-ing-container">
                  {day.ingredients_needed.map((ing, i) => (
                    <span key={i} className="meal-ing" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>{ing}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mealPlan.final_cart && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-base)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🛒 Live Procurement Basket</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 400 }}>Prices are live edge-computed</span>
          </h3>
          
          <div style={{ background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {(mealPlan.final_cart.basket_items || []).map((item, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '1rem', 
                borderBottom: idx < mealPlan.final_cart.basket_items.length - 1 ? '1px solid var(--border-color)' : 'none',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {item.quantity}x {item.item_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {item.logic} (Unit: £{(item.unit_price || 0).toFixed(2)})
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success-color)' }}>
                  £{(item.selected_price || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-light)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--accent-base)' }}>
             <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase' }}>Total Cart Value</span>
             <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                 £{(mealPlan.final_cart.basket_summary?.total_cost || 0).toFixed(2)}
             </span>
          </div>
          
          <button style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '12px', width: '100%', fontSize: '1.1rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
             PROCEED TO CHECKOUT
          </button>
        </div>
      )}

    </div>
  );
}
