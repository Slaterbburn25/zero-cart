import os
import json
from google import genai
from pydantic import BaseModel, Field

class TasteProfileSynthesis(BaseModel):
    behavioral_summary: str = Field(description="A 3-sentence psychological summary of the household's grocery habits (e.g. 'Highly reliant on frozen meats, brand loyal to Heinz, high dairy consumption').")
    brand_loyalties: list[str] = Field(description="A list of specific brands the user purchases frequently, if any.")
    dietary_assumptions: list[str] = Field(description="Assumed dietary constraints or preferences based on the orders.")
    staple_ingredients: list[str] = Field(description="Top 10 ingredients that the user buys consistently.")

def synthesize_taste_profile(raw_order_text: str) -> dict:
    """
    Ingests a raw HTML/InnerText dump of a user's previous supermarket orders and 
    uses Gemini to deduce a highly structured behavioral taste profile to bias the meal generator.
    """
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    from dotenv import load_dotenv
    load_dotenv(env_path)
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[Taste Profiler] GEMINI_API_KEY not found.")
        return None

    client = genai.Client(api_key=api_key)
    
    # Cap token size safely to prevent overflow 
    capped_text = raw_order_text[:35000] 
    
    prompt = f"""
    You are an expert consumer grocery behavior analyst. 
    You have been handed a noisy, raw text dump of a user's chronological digital grocery receipts from a supermarket.
    
    RAW RECEIPT DATA (Messy DOM Extract):
    =================
    {capped_text}
    =================
    
    Carefully analyze this chaotic text block. Identify the most commonly purchased items, brand loyalties, and hidden dietary habits.
    Output a structured TasteProfileSynthesis JSON that summarizes exactly how this user eats, so an AI Chef can generate meals they will actually like.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TasteProfileSynthesis,
                "temperature": 0.2
            },
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"[Taste Profiler] Fatal AI Error: {e}")
        return None
