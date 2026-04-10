import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from logic.llm_ideation import ideate_weekly_plan
from dotenv import load_dotenv

load_dotenv()
engine = create_engine("sqlite:///./zerocart.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

user = db.query(User).filter(User.id == 1).first()
if user:
    print(f"Testing Ideation for user... Dietary: {getattr(user, 'dietary_constraints', 'NOT FOUND')}")
    try:
        res = ideate_weekly_plan(user)
        print("Result:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("User not found")
