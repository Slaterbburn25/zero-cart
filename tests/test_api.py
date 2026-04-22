import requests
import json

payload = {
    "user_id": 1,
    "store_name": "Tesco Live",
    "target_categories": [
        {"query": "Garlic", "estimated_protein": 0, "estimated_cals": 0}
    ]
}

response = requests.post("http://localhost:8000/api/v1/build_cart", json=payload)
print(response.status_code, response.text)

# Let's test a bad payload
payload_bad_store = {
    "user_id": 1,
    "store_name": None,
    "target_categories": []
}

response2 = requests.post("http://localhost:8000/api/v1/build_cart", json=payload_bad_store)
print("BAD:", response2.status_code, response2.text)
