import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv("backend/.env")

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

prompt = (
    "Use the google_search tool to find the exact current price of 'Garlic' on Tesco UK. "
    "To do this reliably, you MUST use the exact search string: "
    "site:www.tesco.com/groceries/en-GB/products Garlic "
    "Do not search anywhere else. Once you find a specific product page, tell me the price."
)

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=prompt,
    config=types.GenerateContentConfig(
        tools=[{"google_search": {}}],
        temperature=0.0
    ),
)
print(response.text)
