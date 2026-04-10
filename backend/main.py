from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from pydantic import BaseModel

# Internal imports
from models import SessionLocal, VirtualFridge

app = FastAPI(
    title="ZeroCart API", 
    description="Edge-Compute Grocery Backend", 
    version="1.0.0"
)

# Dependency to get the active database session from our SQLite logic
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
def trigger_math_engine(user_id: int, db: Session = Depends(get_db)):
    """Generate perfect basket using Google OR-Tools Constraint Solver."""
    from logic.constraint_solver import optimize_basket
    from models import User
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # We pass the user's explicit budget to the solver
    result = optimize_basket(db=db, user_id=user_id, budget=user.weekly_budget, min_protein=400.0)
    return result


# -----------------
# PHASE 3: GEMINI RECIPE ORCHESTRATOR
# -----------------

@app.post("/api/v1/generate_plan")
def generate_weekly_plan(user_id: int, db: Session = Depends(get_db)):
    """Generates a 7-day meal plan based on the Math Engine output."""
    from logic.constraint_solver import optimize_basket
    from logic.llm_chef import generate_recipe_plan
    from models import User
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 1. Run the left-brain Math Engine
    basket_result = optimize_basket(db=db, user_id=user_id, budget=user.weekly_budget, min_protein=400.0)
    
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
# PHASE 5: WHATSAPP INTERFACE
# -----------------

from fastapi import Request

@app.post("/api/v1/whatsapp_webhook")
async def handle_whatsapp_message(request: Request, db: Session = Depends(get_db)):
    """Receives ping from Twilio when Dave sends a WhatsApp message."""
    from logic.whatsapp_bot import process_whatsapp_message
    
    # Twilio sends webhook payloads as Form Data
    form_data = await request.form()
    
    sender_phone = form_data.get("From", "")
    body = form_data.get("Body", "")
    
    # Pass to our logic router
    result_msg = process_whatsapp_message(sender_phone=sender_phone, body=body, db_session=db)
    
    # Return the response to let Twilio or the terminal know we successfully processed it
    return {"status": result_msg}
