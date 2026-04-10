import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# We strictly define the JSON output schema we want Gemini to return
class Meal(BaseModel):
    day: str = Field(description="Day of the week, e.g., Monday")
    meal_type: str = Field(description="Breakfast, Lunch, or Dinner")
    recipe_name: str = Field(description="Name of the dish")
    instructions: str = Field(description="Short step-by-step cooking instructions")
    ingredients_used: List[str] = Field(description="List of ingredients used from the provided basket ONLY")

class WeeklyPlan(BaseModel):
    meals: List[Meal] = Field(description="A list of generated meals for the entire week")

def generate_recipe_plan(basket: List[Dict[str, Any]]) -> dict:
    """
    Takes the strict mathematical basket from OR-Tools and forces Gemini
    to build a 7-day meal plan using ONLY those ingredients.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"status": "error", "message": "GEMINI_API_KEY is not set or invalid in backend/.env"}

    # Initialize the modern google-genai SDK client
    client = genai.Client(api_key=api_key)

    # Format the basket into readable text for the LLM
    ingredients_text = "\n".join([f"- {item['quantity']}x {item['item_name']}" for item in basket])

    system_instruction = (
        "You are ZeroCart's Master Chef AI. Your job is exclusively to generate a 7-day meal plan "
        "consisting of Dinner for each day (and maybe Breakfast/Lunch if ingredients allow). "
        "CRITICAL RULE: You may ONLY use the ingredients provided in the user's basket. "
        "You CANNOT hallucinate or add outside ingredients like 'salt, pepper, oil' unless they are in the basket. "
        "Be extremely creative but realistic."
    )

    prompt = f"Here is the exact grocery basket I bought. Tell me what to cook for the next 7 days:\n{ingredients_text}"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=WeeklyPlan,
                temperature=0.7,
            ),
        )
        # response.text is guaranteed to be a JSON string mathematically bound to WeeklyPlan format
        import json
        plan_json = json.loads(response.text)
        return {"status": "success", "plan": plan_json}
    except Exception as e:
        return {"status": "error", "message": str(e)}
