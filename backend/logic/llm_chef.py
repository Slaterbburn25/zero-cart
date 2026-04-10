import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# We strictly define the JSON output schema we want Gemini to return
class IngredientUsage(BaseModel):
    item_name: str = Field(description="The exact item name from the user's basket")
    quantity_used: float = Field(description="The numeric quantity fraction or integer used in this meal")

class Meal(BaseModel):
    day: str = Field(description="Day of the week, e.g., Monday")
    meal_type: str = Field(description="Breakfast, Lunch, or Dinner")
    recipe_name: str = Field(description="Name of the dish")
    prep_time_mins: int = Field(description="Estimated preparation time in minutes")
    cooking_time_mins: int = Field(description="Estimated cooking time in minutes")
    total_weight_grams: int = Field(description="Estimated total weight of the meal in grams")
    number_of_ingredients: int = Field(description="Total count of discrete ingredients used")
    cooking_instructions: List[str] = Field(description="Detailed step-by-step cooking instructions")
    ingredients_used: List[IngredientUsage] = Field(description="List of exact ingredients used and amounts")

class WeeklyPlan(BaseModel):
    meals: List[Meal] = Field(description="A list of generated meals for the entire week")

def generate_recipe_plan(basket: List[Dict[str, Any]], user) -> dict:
    """
    Orchestrates Gemini 2.5 Flash to act as our personal chef, generating a structured
    7-day recipe JSON array exclusively using the ingredients math-engine generated.
    """
    # Fetch API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"status": "error", "message": "GEMINI_API_KEY is not set"}
    
    # Initialize the modern google-genai SDK client
    client = genai.Client(api_key=api_key)

    # Format the basket into readable text for the LLM
    ingredients_text = "\n".join([f"- {item['quantity']}x {item['item_name']}" for item in basket])

    system_instruction = (
        f"You are ZeroCart's Master Chef AI. Your job is exclusively to generate a 7-day meal plan. "
        f"CRITICAL: For each of the 7 days, you must generate exactly the following meal categories: {user.meal_types_wanted}. "
        f"Each meal MUST proportion enough food to comfortably serve {user.family_size} person/people! "
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
        import json
        plan_json = json.loads(response.text)
        return {"status": "success", "plan": plan_json}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def generate_single_recipe(day: str, basket: List[Dict[str, Any]]) -> dict:
    """
    Generates EXACTLY ONE meal substitution.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"status": "error", "message": "GEMINI_API_KEY is not set"}

    client = genai.Client(api_key=api_key)
    ingredients_text = "\n".join([f"- {item['quantity']}x {item['item_name']}" for item in basket])

    system_instruction = (
        "You are ZeroCart's Master Chef AI. Your job is exclusively to generate ONE replacement meal "
        "for the user. CRITICAL RULE: You may ONLY use the ingredients provided in the user's basket. "
        "Do not invent ingredients."
    )

    prompt = f"Here is my basket:\n{ingredients_text}\n\nProvide one newly generated alternative recipe for {day}."

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=Meal,
                temperature=0.9, # Higher temperature for variation
            ),
        )
        import json
        meal_json = json.loads(response.text)
        return {"status": "success", "meal": meal_json}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def generate_dish_image(recipe_name: str) -> dict:
    """Uses Imagen to generate a base64 encoded picture of the meal."""
    import base64
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        return {"status": "error", "message": "GEMINI_API_KEY is not set"}

    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_images(
            model='imagen-3.0-generate-001',
            prompt=f"A beautiful, high-quality, perfectly plated appetizing food photography shot of a dish called: {recipe_name}",
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/jpeg",
                aspect_ratio="1:1"
            )
        )
        if response.generated_images:
            img_b64 = base64.b64encode(response.generated_images[0].image.image_bytes).decode('utf-8')
            return {"status": "success", "image_base64": img_b64}
        return {"status": "error", "message": "No image generated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
