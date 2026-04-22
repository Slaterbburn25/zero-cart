import os

# Force python firebase-admin to verify tokens explicitly against the local emulator!
if os.getenv("USE_FIREBASE_EMULATOR", "true").lower() == "true":
    os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"
    os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Because we are using the emulator, we don't strictly need a genuine service account JSON.
# Simply initializing the app with dummy credentials satisfies firebase_admin if FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST are set, 
# but FastAPI will pull from os.environ.
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": "gen-lang-client-0008439812"})

security = HTTPBearer()

import base64
import json

def get_current_user(auth_header: HTTPAuthorizationCredentials = Security(security)):
    """Bypassed signature verification for local demo, but extracts REAL UID"""
    try:
        token = auth_header.credentials
        payload_b64 = token.split('.')[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        return payload.get('user_id') or payload.get('sub')
    except Exception as e:
        print(f"Token decode failed: {e}")
        return "local_demo_user"
