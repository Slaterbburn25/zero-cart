from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from pydantic import BaseModel
import os
import subprocess

# Internal imports
from models import SessionLocal, VirtualFridge

app = FastAPI(
    title="ZeroCart API", 
    description="Edge-Compute Grocery Backend", 
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------
# PYDANTIC SCHEMAS (For input/output validation)
# -----------------
class FridgeItemCreate(BaseModel):
    user_id: int
    item_name: str
    category: str
    quantity: float
    unit: str
    expiration_date: date

class FridgeItemResponse(FridgeItemCreate):
    id: int

    class Config:
        from_attributes = True

# -----------------
# API ENDPOINTS
# -----------------

@app.get("/")
def read_root():
    return {"status": "success", "message": "ZeroCart Brain is online"}

@app.post("/api/v1/fridge/add", response_model=FridgeItemResponse)
def add_to_fridge(item: FridgeItemCreate, db: Session = Depends(get_db)):
    """Add a new item to the Virtual Fridge."""
    # Convert incoming Pydantic validation schema to SQLAlchemy database model directly
    db_item = VirtualFridge(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/api/v1/fridge/{user_id}", response_model=List[FridgeItemResponse])
def get_fridge(user_id: int, db: Session = Depends(get_db)):
    """Retrieve all current inventory in the fridge for a specific user."""
    items = db.query(VirtualFridge).filter(VirtualFridge.user_id == user_id).all()
    return items

@app.delete("/api/v1/fridge/remove/{item_id}")
def remove_from_fridge(item_id: int, db: Session = Depends(get_db)):
    """Manually delete an item from the fridge (simulates consuming it)."""
    db_item = db.query(VirtualFridge).filter(VirtualFridge.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found in your fridge")
    
    db.delete(db_item)
    db.commit()
    return {"message": f"Successfully consumed item {item_id}"}


# Legacy endpoint removed. Now handled dynamically inside build_cart.

class UserProfileUpdate(BaseModel):
    weekly_budget: float | None
    calorie_limit: int | None
    family_size: int
    meal_types_wanted: str
    preferred_store: str
    primary_goal: str
    preferred_meats: str
    hated_foods: str

@app.get("/api/v1/user/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    import models
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/v1/user/1")
def update_user_profile(profile: UserProfileUpdate, db: Session = Depends(get_db)):
    """Mock edge node profile persistence handling advanced personas."""
    import models
    user = db.query(models.User).filter(models.User.id == 1).first()
    
    # Instantiate singleton if empty
    if not user:
        user = models.User(
            id=1, 
            email="edge@zerocart.local"
        )
        db.add(user)
        
    user.weekly_budget = profile.weekly_budget
    user.calorie_limit = profile.calorie_limit
    user.family_size = profile.family_size
    user.meal_types_wanted = profile.meal_types_wanted
    user.preferred_store = profile.preferred_store
    user.primary_goal = profile.primary_goal
    user.preferred_meats = profile.preferred_meats
    user.hated_foods = profile.hated_foods
    
    db.commit()
    return {"status": "success", "user": user}

# -----------------
# PIPELINE PHASE 1: IDEATION
# -----------------

@app.post("/api/v1/ideate")
def ideate_meals(user_id: int, db: Session = Depends(get_db)):
    """Generates pure Meal Ideas natively from nothing."""
    from logic.llm_ideation import ideate_weekly_plan
    import models
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    ideation_result = ideate_weekly_plan(user=user)
    
    if ideation_result.get("status") != "success":
        raise HTTPException(status_code=500, detail=f"Gemini failed: {ideation_result.get('message')}")
        
    return ideation_result.get("plan")

@app.post("/api/v1/ideate_single_meal")
def ideate_single_day(day: str, user_id: int, db: Session = Depends(get_db)):
    """Generates a replacement meal ideation for a specific day."""
    from logic.llm_ideation import ideate_single_meal
    import models
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    ideation_result = ideate_single_meal(day=day, user=user)
    if ideation_result.get("status") != "success":
        raise HTTPException(status_code=500, detail="Gemini failed.")
        
    return ideation_result.get("plan")

# -----------------
# PIPELINE PHASE 2: HUNT AND MATH
# -----------------

class BuildCartPayload(BaseModel):
    user_id: int
    store_name: str
    target_categories: list  # The abstract required_ingredients dicts list

@app.post("/api/v1/build_cart")
def build_cart(payload: BuildCartPayload, db: Session = Depends(get_db)):
    """Dynamically hunts for prices and generates a math basket."""
    from logic.llm_scraper import get_live_deals
    import models
    
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 1. Scrape Exact Abstract Ideas
    output = get_live_deals(target_categories=payload.target_categories)
    if output.get("status") != "success":
        raise HTTPException(status_code=500, detail="Failed to creatively hunt required items via Google Search.")
        
    deals = output.get("deals", [])
    
    # Wipe old "Tesco Live" local persistence
    db.query(models.LocalDeal).filter(models.LocalDeal.store_name == payload.store_name).delete()
    
    # Inject active hunt explicitly
    for deal_data in deals:
        try:
            # Our IDE scraped model actually returned classes or dicts depending on execution.
            raw_price = deal_data.get("price") if isinstance(deal_data, dict) else deal_data.price
            final_price = float(raw_price) if raw_price else 1.50
            if final_price <= 0.01:
                final_price = 1.25 # Global emergency fallback for staples

            new_deal = models.LocalDeal(
                store_name=payload.store_name,
                sku=deal_data.get("sku") if isinstance(deal_data, dict) else deal_data.sku,
                item_name=deal_data.get("item_name") if isinstance(deal_data, dict) else deal_data.item_name,
                price=final_price,
                price_per_unit=deal_data.get("price_per_unit") if isinstance(deal_data, dict) else getattr(deal_data, "price_per_unit", 1.0),
                item_url=deal_data.get("url", "") if isinstance(deal_data, dict) else getattr(deal_data, "url", ""),
                protein_grams=deal_data.get("protein_grams") if isinstance(deal_data, dict) else deal_data.protein_grams,
                calories=deal_data.get("calories") if isinstance(deal_data, dict) else deal_data.calories
            )
            db.add(new_deal)
        except Exception as e:
            print(f"Error saving Target Deal: {e}")
    db.commit()
    # 2. Run the LLM Basket Architect to apply human common-sense rationing
    from logic.llm_basket_architect import allocate_basket
    
    # We fetch the exact DB records just scraped so Gemini has absolute SKU/price truth
    fresh_deals = db.query(models.LocalDeal).filter(models.LocalDeal.store_name == payload.store_name).all()
    
    architect_result = allocate_basket(user=user, scraped_deals=fresh_deals)
    
    if architect_result.get("status") != "success":
        raise HTTPException(status_code=500, detail=f"Basket Architect failed: {architect_result.get('message')}")
        
    final_basket = []
    total_cost = 0.0
    total_protein = 0.0
    
    # Map the LLM's SKUs back to the DB to natively calculate real totals
    for allocation in architect_result.get("allocations", []):
        sku = allocation.get("sku")
        qty = allocation.get("quantity", 1)
        deal_obj = next((d for d in fresh_deals if d.sku == sku), None)
        
        if deal_obj and qty > 0:
            final_basket.append({
                "sku": deal_obj.sku,
                "item_name": deal_obj.item_name,
                "url": getattr(deal_obj, 'item_url', getattr(deal_obj, 'url', '')),
                "quantity": qty,
                "selected_price": round(qty * deal_obj.price, 2),
                "logic": allocation.get("logic", "")
            })
            total_cost += qty * deal_obj.price
            total_protein += qty * deal_obj.protein_grams

    return {
        "basket_summary": {
             "total_cost": round(total_cost, 2),
             "total_protein_grams": round(total_protein, 2),
             "budget_utilized": f"{round((total_cost/user.weekly_budget)*100, 1)}%" if user.weekly_budget else "N/A"
        },
        "basket_items": final_basket
    }

@app.get("/api/v1/generate_meal_image")
def get_meal_image(recipe_name: str):
    from logic.llm_chef import generate_dish_image
    result = generate_dish_image(recipe_name)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return {"image_base64": result.get("image_base64")}

# -----------------
# PHASE 5: PWA INTERFACE
# -----------------

@app.post("/api/v1/cart/approve")
def approve_cart(user_id: int):
    """
    Called by the PWA. Approves the basket and fires the Playwright browser automation
    to autonomously navigate to Tesco/ASDA and purchase the items.
    """
    print(f"User {user_id} approved the cart! Firing Edge Agent subprocess...")
    
    try:
        # Fire the Edge Agent asynchronously
        subprocess.Popen(
            ["node", "../../edge-client/cart_injector.js"],
            cwd=os.path.abspath(os.path.dirname(__file__))
        )
        return {"status": "success", "message": "Edge Agent launched. Check your Monzo app for payment approval."}
    except Exception as e:
        print(f"Failed to launch Edge Agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to launch Playwright agent: {str(e)}")
