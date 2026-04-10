import os
import subprocess
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

# Secure Twilio initialization from .env
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

# In-memory "state" mapper just for demonstration (in production this sits in SQL or Redis)
# Maps a user's phone number to "WAITING_FOR_YES"
user_states = {}

def process_whatsapp_message(sender_phone: str, body: str, db_session) -> str:
    """
    Acts as the conversational router between Dave and his ZeroCart algorithms.
    """
    body_clean = body.strip().lower()
    
    # Needs Twilio keys to execute replies
    if not TWILIO_ACCOUNT_SID or TWILIO_ACCOUNT_SID == "PLACEHOLDER":
        return "Twilio configuration missing in backend/.env"

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    reply_message = ""

    # State: Awaiting injection approval
    if user_states.get(sender_phone) == "WAITING_FOR_YES":
        if body_clean == "yes":
            # Fire the Playwright script instantly via Node
            reply_message = "⚡ Approval received! The Playwright bot is taking over your laptop right now. Please authorize the final payment on your Monzo app when it pops up!"
            
            # Fire the Edge Agent asynchronously
            try:
                subprocess.Popen(
                    ["node", "../../edge-client/cart_injector.js"],
                    cwd=os.path.abspath(os.path.dirname(__file__))
                )
            except Exception as e:
                print(f"Failed to launch Edge Agent: {e}")
                
            user_states[sender_phone] = "IDLE"
        else:
            reply_message = "Shopping cart canceled. Let me know when you want to build another one."
            user_states[sender_phone] = "IDLE"
            
    # Command: Initial Cart Generation
    elif body_clean in ["shop", "build cart", "build my cart", "zero"]:
        from logic.constraint_solver import optimize_basket
        from models import User
        
        # We explicitly lock it to Dave (User Admin 1) for the MVP
        dave = db_session.query(User).filter(User.id == 1).first()
        
        basket_result = optimize_basket(db=db_session, user_id=1, budget=dave.weekly_budget, min_protein=400.0)
        
        if basket_result.get("status") == "success":
            cost = basket_result["summary"]["total_cost"]
            protein = basket_result["summary"]["total_protein_grams"]
            
            reply_message = f"🥦 ZeroCart Algorithm Complete!\n\nI just built a mathematically perfect basket.\nCost: £{cost} (£{dave.weekly_budget - cost} under budget!)\nProtein: {protein}g\n\nReply YES to inject this basket into Tesco."
            user_states[sender_phone] = "WAITING_FOR_YES"
        else:
            reply_message = "I hit an error trying to calculate the logic. " + basket_result.get("reason", "")
    
    # Catch-all
    else:
        reply_message = "Welcome to ZeroCart via WhatsApp! Text 'shop' to calculate this week's algorithms."

    # Physically send the reply back to Dave's phone via Twilio
    try:
        client.messages.create(
            body=reply_message,
            from_=TWILIO_WHATSAPP_NUMBER,
            to=sender_phone
        )
    except Exception as e:
        print(f"Twilio API Error: {str(e)}")
        # We can still print it locally so the user knows what failed
        print(f"Intended Message: {reply_message}")
        return f"Error: {str(e)}"
    
    return "Message processed"
