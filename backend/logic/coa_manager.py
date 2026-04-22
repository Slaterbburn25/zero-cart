import os
import json
from google import genai
from google.genai import types
from logic.bigquery_client import ZeroCartBQ
from dotenv import load_dotenv

# Inherit global credentials from the backend root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class COAManager:
    def __init__(self):
        self.bq = ZeroCartBQ()
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        
        # Load Corporate Knowledge
        self.knowledge = self._load_context()

    def _load_context(self):
        ctx = ""
        files = ["../BusinessPlan.md", "../UserProfile.md", "../mission_control/intent.md"]
        for f in files:
            path = os.path.join(os.path.dirname(__file__), f)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as doc:
                    ctx += f"\n--- DOCUMENT: {f} ---\n{doc.read()}"
        return ctx

    def evaluate_and_issue_orders(self, user_id: int):
        """The COA reads the intent, checks user preferences, and shouts the next logical step."""
        print(f"🧠 COA: Evaluating current business state for User {user_id}...")
        
        from models import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        
        if not user:
            print(f"User {user_id} not found. Aborting COA cycle.")
            return None
            
        user_context = f"\n--- USER CONTEXT ---\nPostcode: {user.postcode}\nPreferences: {json.dumps(user.preferences)}\n"
        
        system_instruction = (
            "You are the ZeroCart Chief Operating Agent. Your job is to read the "
            "Strategic Intent and decide the next technical step for the Directors. "
            "You MUST output raw JSON matching this schema: "
            "{'task_type': 'IDEATE' | 'SCRAPE' | 'RESTOCK', 'payload': dict}"
        )

        prompt = f"Context: {self.knowledge}\n{user_context}\nWhat is the next mission for the Supply Chain Director?"

        response = self.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.0
            )
        )

        order = json.loads(response.text)
        
        # Ensure user_id is forcibly embedded into the payload so SCD knows who this is for
        if 'payload' not in order:
            order['payload'] = {}
        order['payload']['user_id'] = user_id
        
        mission_id = self.bq.shout_order(order['task_type'], order['payload'])
        return mission_id

if __name__ == "__main__":
    coa = COAManager()
    # Mocking user 1 for the standalone test script
    mid = coa.evaluate_and_issue_orders(user_id=1)
    if mid:
        print(f"✅ COA has issued Mission ID: {mid}")
