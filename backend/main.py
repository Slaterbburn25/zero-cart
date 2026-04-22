from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from pydantic import BaseModel

class TrainPayload(BaseModel):
    email: str
    password: str
import os
import subprocess

EDGE_SCRAPER_URL = os.getenv("EDGE_SCRAPER_URL", "http://127.0.0.1:8001")

# Internal imports
from models import SessionLocal, VirtualFridge
from firebase_auth import get_current_user

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

    model_config = {"from_attributes": True}

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

class UserCreate(BaseModel):
    email: str
    postcode: str = "BB1 1AA"
    preferences: dict = {}

class UserProfileUpdate(BaseModel):
    postcode: str | None = None
    preferences: dict | None = None

@app.post("/api/v1/user/create")
def create_user(user: UserCreate, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new user with dedicated pricing and profile isolation."""
    import models
    from sqlalchemy.exc import IntegrityError
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.id == uid).first()
    if existing_user:
        return {"status": "success", "user": {"id": existing_user.id, "email": existing_user.email, "postcode": existing_user.postcode, "preferences": existing_user.preferences}}

    db_user = models.User(
        id=uid,
        email=user.email,
        postcode=user.postcode,
        preferences=user.preferences
    )
    db.add(db_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # In a local Firebase emulator environment, UIDs can be randomly recycled/orphaned.
        # If the email matches a ghost user, we delete the ghost to unblock the new UID.
        ghost_user = db.query(models.User).filter(models.User.email == user.email).first()
        if ghost_user:
            db.delete(ghost_user)
            db.commit()
            
            # Try recreation with the new Firebase UID
            db_user = models.User(id=uid, email=user.email, postcode=user.postcode, preferences=user.preferences)
            db.add(db_user)
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Database integrity collision.")
            
    db.refresh(db_user)
    return {
        "status": "success", 
        "user": {
            "id": db_user.id, 
            "email": db_user.email, 
            "postcode": db_user.postcode, 
            "preferences": db_user.preferences
        }
    }

@app.get("/api/v1/user/{user_id}")
def get_user_profile(user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    import models
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "postcode": user.postcode,
        "preferences": user.preferences
    }

@app.put("/api/v1/user/{user_id}")
def update_user_profile(user_id: str, profile: UserProfileUpdate, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dynamically updates JSON preferences without breaking schemas."""
    import models
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile.postcode is not None:
        user.postcode = profile.postcode
    if profile.preferences is not None:
        user.preferences = profile.preferences
    
    db.commit()
    db.refresh(user)
    
    return {
        "status": "success", 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "postcode": user.postcode, 
            "preferences": user.preferences
        }
    }

# -----------------
# PIPELINE PHASE 1: TASTE PROFILING
# -----------------
@app.post("/api/v1/profile/train")
def train_agent_history(payload: TrainPayload, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    import requests
    import models
    import json
    from fastapi.responses import StreamingResponse
    from logic.llm_taste_profiler import synthesize_taste_profile
    from sqlalchemy.orm.attributes import flag_modified
    
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    store = user.preferences.get("store_preference", "Tesco Live") if user.preferences else "Tesco Live"
    
    def event_stream():
        try:
            # 1. Ping Edge Node with stream=True
            response = requests.post(
                f"{EDGE_SCRAPER_URL}/api/v1/profile/scrape_history",
                json={"store_name": store, "email": payload.email, "password": payload.password},
                stream=True,
                timeout=300
            )
            
            history_raw_text = ""
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        data_str = decoded_line[6:]
                        try:
                            data_obj = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue
                            
                        if data_obj.get('type') == 'log':
                            yield f"data: {json.dumps(data_obj)}\n\n"
                        elif data_obj.get('type') == 'error':
                            yield f"data: {json.dumps(data_obj)}\n\n"
                            return
                        elif data_obj.get('type') == 'success':
                            history_raw_text = data_obj.get('raw_text', "")
                            yield f"data: {json.dumps({'type': 'log', 'message': '[Backend] Edge payload received. Synthesizing AI Taste Profile...'})}\n\n"
                            break

            if not history_raw_text or len(history_raw_text) < 20:
                 yield f"data: {json.dumps({'type': 'error', 'message': 'No order history found.'})}\n\n"
                 return
                 
            # 2. Synthesize with Gemini
            taste_json = synthesize_taste_profile(history_raw_text)
            if not taste_json:
                 yield f"data: {json.dumps({'type': 'error', 'message': 'Gemini failed to synthesize taste profile.'})}\n\n"
                 return
                 
            # 3. Store natively in DB
            prefs = user.preferences or {}
            prefs["taste_profile"] = taste_json
            
            user.preferences = prefs
            flag_modified(user, "preferences")
            db.commit()
            
            yield f"data: {json.dumps({'type': 'complete', 'taste_profile': taste_json})}\n\n"
            
        except Exception as e:
            print(f"[Core] Error training agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# train_continue removed as it is no longer required for headless pipelines

# -----------------
# PIPELINE PHASE 2: MEAL GENERATION
# -----------------

@app.post("/api/v1/ideate_cart")
def ideate_meals(user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Triggers an asynchronous IDEATE mission inside BigQuery."""
    import models
    from logic.bigquery_client import ZeroCartBQ
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Wipe the previous cache state so polling doesn't falsely complete instantly
    db.query(models.ProposedBasket).filter(models.ProposedBasket.user_id == uid).delete()
    db.commit()
    
    store = user.preferences.get("store_preference", "Tesco Live") if user.preferences else "Tesco Live"
    
    # Fire and Forget
    bq = ZeroCartBQ()
    mission_id = bq.shout_order("IDEATE", {"user_id": user_id, "target": store})
    return {"status": "queued", "mission_id": mission_id}

@app.get("/api/v1/ideate_status")
def get_ideate_status(user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Async polling hook to pull localized SQLite schemas safely."""
    import models
    import json
    
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    basket = db.query(models.ProposedBasket).filter(models.ProposedBasket.user_id == uid).first()
    if not basket:
        return {"status": "pending"}
    
    return {"status": "success", "plan": json.loads(basket.plan_json)}

@app.post("/api/v1/ideate_single_meal")
def ideate_single_day(day: str, user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generates a replacement meal ideation for a specific day."""
    from logic.llm_ideation import ideate_single_meal
    import models
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    user = db.query(models.User).filter(models.User.id == uid).first()
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
    user_id: str
    store_name: str
    target_categories: list  # The abstract required_ingredients dicts list

@app.post("/api/v1/build_cart")
def build_cart(payload: BuildCartPayload, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    """Triggers a distributed SCRAPE loop that natively chains into a BUILD loop natively on the Grid."""
    from logic.bigquery_client import ZeroCartBQ
    import models
    
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Wipe stale cart
    db.query(models.FinalBasket).filter(models.FinalBasket.user_id == payload.user_id).delete()
    db.commit()
    
    # Shout order into the cluster
    bq = ZeroCartBQ()
    bq_payload = {"user_id": user.id, "target": payload.store_name, "targets": payload.target_categories}
    mission_id = bq.shout_order("SCRAPE", bq_payload)
    
    return {"status": "queued", "mission_id": mission_id}

@app.get("/api/v1/cart_status")
def get_cart_status(user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Async polling hook to pull FinalBasket out of localized SQLite securely."""
    import models
    import json
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    basket = db.query(models.FinalBasket).filter(models.FinalBasket.user_id == uid).first()
    if not basket:
        return {"status": "pending"}
        
    return {"status": "success", "cart_data": json.loads(basket.cart_json)}
    

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
def approve_cart(user_id: str, uid: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != uid:
        raise HTTPException(status_code=403, detail='Unauthorized')
    """
    Called by the PWA. Approves the basket and fires the Playwright browser automation
    to autonomously navigate to Tesco/ASDA and purchase the items.
    """
    import models
    import json
    
    basket = db.query(models.FinalBasket).filter(models.FinalBasket.user_id == uid).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Cart not found")
        
    cart_data = json.loads(basket.cart_json)
    
    # Save to local file for Node edge client to read natively
    edge_client_dir = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "edge-client")
    os.makedirs(edge_client_dir, exist_ok=True)
    
    payload_path = os.path.join(edge_client_dir, "pending_inject.json")
    with open(payload_path, "w", encoding="utf-8") as f:
        json.dump(cart_data, f)
        
    print(f"User {uid} approved the cart! Payload dumped to {payload_path}. Firing Edge Agent subprocess...")
    
    try:
        # Fire the Edge Agent asynchronously
        subprocess.Popen(
            ["node", "cart_injector.js"],
            cwd=edge_client_dir
        )
        return {"status": "success", "message": "Edge Agent launched. Check your Monzo app for payment approval."}
    except Exception as e:
        print(f"Failed to launch Edge Agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to launch Playwright agent: {str(e)}")
