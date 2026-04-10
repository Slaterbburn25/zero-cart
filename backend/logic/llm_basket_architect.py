import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Dict

# The expected output schema
class BasketAllocation(BaseModel):
    sku: str = Field(description="The exact SKU string of the item to purchase.")
    quantity: int = Field(description="The precise integer quantity to buy. Use human common-sense limits.")
    logic: str = Field(description="Brief explanation of your quantity choice (e.g. '1x 500g rice covers 8 portions').")

class FinalBasketPlan(BaseModel):
    items: list[BasketAllocation]

def allocate_basket(user, scraped_deals: List[Dict]) -> dict:
    """
    Uses Gemini to apply human common-sense rationing and volume logic 
    to a list of scraped product deals, bypassing dumb mathematical limits.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.environ.get("GEMINI_API_KEY")
        
    client = genai.Client(api_key=api_key)

    # Convert the SQLAlchemy LocalDeal objects into a clean JSON string for the prompt
    deal_strings = []
    for d in scraped_deals:
        deal_strings.append(f"SKU: {d.sku} | Name: {d.item_name} | Price: £{d.price:.2f} | Protein: {d.protein_grams}g | Cals: {d.calories}")
    
    inventory_context = "\n".join(deal_strings)

    system_instruction = (
        "You are ZeroCart's Basket Allocation Architect. "
        "Your job is to look at a list of exact products we scraped from Tesco, and decide EXACTLY how many of each we need to buy. "
        "Apply STRONGLY accurate human common-sense reasoning to volume. "
        f"The user is cooking for a family of {user.family_size}. "
        f"They are cooking {len(user.meal_types_wanted.split(',')) * 7} total meals this week. "
        "CRITICAL RULES: \n"
        "1. Never buy 8 bottles of oil, or 8 blocks of butter to hit a 'calorie metric'. One unit of a pantry staple is usually enough for an entire week. \n"
        "2. Think about volume: a 1kg bag of rice is easily enough for 10-12 adult portions. Do not buy 5 bags of rice. \n"
        "3. Only choose SKUs that are physically present in the provided inventory list. Do not hallucinate items. \n"
        "4. Your goal is to provide enough gross food to feed them, but without insane over-purchasing."
    )

    prompt = f"Available Scraped Inventory to build from:\n\n{inventory_context}\n\nAllocate the perfect quantities for this week."

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FinalBasketPlan,
                system_instruction=system_instruction,
                temperature=0.0
            ),
        )
        
        # Parse the JSON response manually if Pydantic direct mapping acts weird with schema payload
        raw_text = response.text
        if raw_text.startswith("```json"):
            raw_text = raw_text.strip("```json").strip("```").strip()
            
        data = json.loads(raw_text)
        return {"status": "success", "allocations": data.get("items", [])}
        
    except Exception as e:
        print(f"BASKET ARCHITECT FAILURE: {str(e)}")
        return {"status": "error", "message": str(e)}
