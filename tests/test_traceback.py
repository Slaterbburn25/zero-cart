from sqlalchemy.orm import Session
from backend.models import SessionLocal, User
from backend.logic.llm_ideation import ideate_weekly_plan
import json

db = SessionLocal()
user = db.query(User).filter(User.id == 1).first()

try:
    res = ideate_weekly_plan(user)
    print("SUCCESS", json.dumps(res, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
