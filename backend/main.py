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


# -----------------
# PHASE 2: MATH ENGINE ENDPOINTS
# -----------------

@app.post("/api/v1/optimize_basket")
def trigger_math_engine(user_id: int, store_name: str = "Tesco Blackburn", db: Session = Depends(get_db)):
    """Generate perfect basket using Google OR-Tools Constraint Solver."""
    from logic.constraint_solver import optimize_basket
    from models import User
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # We pass the user's explicit budget to the solver
    result = optimize_basket(db=db, user_id=user_id, budget=user.weekly_budget, min_protein=400.0, store_name=store_name)
    return result


# -----------------
# PHASE 3: GEMINI RECIPE ORCHESTRATOR
# -----------------

@app.post("/api/v1/generate_plan")
def generate_weekly_plan(user_id: int, store_name: str = "Tesco Blackburn", db: Session = Depends(get_db)):
    """Generates a 7-day meal plan based on the Math Engine output."""
    from logic.constraint_solver import optimize_basket
    from logic.llm_chef import generate_recipe_plan
    from models import User
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 1. Run the left-brain Math Engine
    basket_result = optimize_basket(db=db, user_id=user_id, budget=user.weekly_budget, min_protein=400.0, store_name=store_name)
    
    if basket_result.get("status") != "success":
        raise HTTPException(status_code=400, detail="Math Engine failed to build a valid basket.")
        
    # 2. Extract the raw ingredient payload
    basket_items = basket_result.get("basket", [])
    
    # 3. Pass it directly to the right-brain Gemini LLM
    llm_result = generate_recipe_plan(basket=basket_items)
    
    if llm_result.get("status") == "error":
        raise HTTPException(status_code=500, detail=f"LLM Error: {llm_result.get('message')}")
        
    # Return the combined masterpiece
    return {
        "basket_summary": basket_result.get("summary"),
        "meal_plan": llm_result.get("plan")
    }

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
