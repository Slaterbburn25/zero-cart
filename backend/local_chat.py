import sys
import os
import subprocess
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, User
from logic.whatsapp_bot import user_states

# Connect to the local SQLite database
engine = create_engine("sqlite:///./zerocart.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

PHONE = "local_dev_user"

print("======================================================")
print("  📱 ZeroCart Local Interface Simulator")
print("  (Bypassing Twilio to save you £20!)")
print("======================================================")
print("Type 'shop' to trigger the Math Engine.")
print("Type 'exit' to close.")
print("------------------------------------------------------\n")

while True:
    try:
        user_input = input("[Dave]: ").strip().lower()
        if user_input == "exit":
            break
            
        # Simulating the exact state-engine logic from whatsapp_bot.py
        if user_states.get(PHONE) == "WAITING_FOR_YES":
            if user_input == "yes":
                print("\n[ZeroCart AI]: ⚡ Approval received! Firing up the Edge Agent. Do not touch your mouse! Watch Chrome!\n")
                try:
                    subprocess.Popen(
                        ["node", "cart_injector.js"],
                        cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'edge-client'))
                    )
                except Exception as e:
                    print(f"Failed to launch Edge Agent: {e}")
                user_states[PHONE] = "IDLE"
            else:
                print("\n[ZeroCart AI]: Shopping cart canceled. Let me know when you want to build another one.\n")
                user_states[PHONE] = "IDLE"
                
        elif user_input in ["shop", "build cart", "build my cart", "zero"]:
            print("\n[ZeroCart AI]: (Thinking... calculating Left-Brain constraints)\n")
            
            from logic.constraint_solver import optimize_basket
            dave = db.query(User).filter(User.id == 1).first()
            if not dave:
                print("[ZeroCart AI]: Error: Could not find User 1 in database.")
                continue
                
            # Trigger the actual OR-Tools solver
            basket_result = optimize_basket(db=db, user_id=1, budget=dave.weekly_budget, min_protein=400.0)
            
            if basket_result.get("status") == "success":
                cost = basket_result["summary"]["total_cost"]
                protein = basket_result["summary"]["total_protein_grams"]
                
                print(f"[ZeroCart AI]: 🥦 Algorithm Complete!")
                print(f"I just built a mathematically perfect basket.")
                print(f"Cost: £{cost} (£{round(dave.weekly_budget - cost, 2)} under budget!)")
                print(f"Protein: {protein}g")
                print(f"\nReply YES to inject this basket into Tesco.\n")
                
                user_states[PHONE] = "WAITING_FOR_YES"
            else:
                print("[ZeroCart AI]: Error calculating basket. " + basket_result.get("reason", ""))
        else:
            print("\n[ZeroCart AI]: Welcome to ZeroCart! Text 'shop' to calculate this week's algorithms.\n")
            
    except KeyboardInterrupt:
        break

db.close()
