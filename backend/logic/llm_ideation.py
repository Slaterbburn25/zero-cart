import os
import json
from typing import List
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

class RequiredIngredient(BaseModel):
    query: str = Field(description="Generic search term like 'Pasta', 'Chicken Breast', etc")
    estimated_protein: int = Field(description="Estimate protein per 100g")
    estimated_cals: int = Field(description="Estimate cals per 100g")

class MealIdeation(BaseModel):
    day: str = Field(description="Day of the week, e.g., Monday")
    meal_type: str = Field(description="Breakfast, Lunch, or Dinner")
    recipe_name: str = Field(description="Name of the dish")
    cooking_instructions: List[str] = Field(description="Detailed step-by-step cooking instructions")

class MealPlanIdeation(BaseModel):
    meals: List[MealIdeation]
    required_ingredients: List[RequiredIngredient]

def ideate_weekly_plan(user) -> dict:
    """
    Ideates a 7-day meal plan based entirely on Profile Constraints,
    and returns an abstract required grocery list for the scraper to hunt.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"status": "error", "message": "GEMINI_API_KEY is not set"}
    
    client = genai.Client(api_key=api_key)

    system_instruction = (
        f"You are ZeroCart's Master Chef AI. Your job is exclusively to brainstorm a 7-day meal plan. "
        f"CRITICAL: For each of the 7 days, you must generate exactly the following meal categories: {user.meal_types_wanted}. "
        f"Each meal MUST proportion enough food to comfortably serve {user.family_size} person/people! "
        f"The user's dietary preferences are: {user.dietary_constraints}. "
        "DREAM UP amazing recipes! Be highly creative. "
        "Crucially, you must build an aggregated abstract 'required_ingredients' list unifying everything needed to cook these 7 days of meals. "
        "Keep the 'query' strings generic enough for a supermarket search (e.g. 'Beef Mince', 'Cheddar Cheese', 'Spaghetti')."
    )

    prompt = "Generate the 7-day Meal Plan Ideation."

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                response_mime_type="application/json",
                response_schema=MealPlanIdeation,
            ),
        )
        
        parsed = json.loads(response.text)
        return {"status": "success", "plan": parsed}
        
    except Exception as e:
        print(f"Agentic Ideator Error: {e}")
        return {"status": "error", "message": str(e)}

def ideate_single_meal(day: str, user) -> dict:
    """Ideates a single Meal Ideation to swap out a bad recipe."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"status": "error", "message": "API KEY not set"}
    
    client = genai.Client(api_key=api_key)
    system_instruction = (
        f"You are ZeroCart's Master Chef AI. "
        f"The user wants a completely new set of meals for {day}. "
        f"Generate {user.meal_types_wanted} exclusively for {day}. "
        f"Also provide the required abstract ingredients needed just for these meals."
    )
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Give me alternative meals for {day}.",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.8,
                response_mime_type="application/json",
                response_schema=MealPlanIdeation,
            ),
        )
        parsed = json.loads(response.text)
        return {"status": "success", "plan": parsed}
    except Exception as e:
        return {"status": "error", "message": str(e)}
