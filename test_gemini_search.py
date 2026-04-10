import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv("backend/.env")

def test_search():
    client = genai.Client()
    prompt = "Search tesco.com exactly for the current price of 'Broccoli'. Give me the top 3 results, their exact name, price, and url."
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[{"google_search": {}}],
            temperature=0.0
        ),
    )
    print(response.text)

if __name__ == "__main__":
    test_search()
