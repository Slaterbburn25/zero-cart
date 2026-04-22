import requests
import json

# 1. Ideate
print("Ideating...")
res1 = requests.post("http://localhost:8000/api/v1/ideate?user_id=1")
if res1.status_code != 200:
    print("IDEATE FAILED", res1.status_code, res1.text)
    exit(1)

plan = res1.json()
ingredients = plan.get("required_ingredients", [])
print(f"Generated {len(ingredients)} ingredients.")

# 2. Build Cart
print("Building Cart with dynamic ingredients...")
payload = {
    "user_id": 1,
    "store_name": "Tesco Live",
    "target_categories": ingredients
}

res2 = requests.post("http://localhost:8000/api/v1/build_cart", json=payload)
print("Cart Result:", res2.status_code)
try:
    print(json.dumps(res2.json(), indent=2))
except:
    print(res2.text)
