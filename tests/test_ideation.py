import requests
import json

response = requests.post("http://localhost:8000/api/v1/ideate_meals?user_id=1")
if response.status_code == 200:
    data = response.json()
    print("Meals:", len(data.get("meals", [])))
    print("Ingredients:", json.dumps(data.get("required_ingredients", []), indent=2))
else:
    print(response.status_code, response.text)
