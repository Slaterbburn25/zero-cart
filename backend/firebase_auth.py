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

def get_current_user(auth_header: HTTPAuthorizationCredentials = Security(security)):
    """Extracts UI Firebase token and passes back the localized UID for SQLite lookup."""
    try:
        # Will inherently consult FIREBASE_AUTH_EMULATOR_HOST natively if exported in ENV
        decoded_token = auth.verify_id_token(auth_header.credentials)
        return decoded_token['uid']
    except Exception as e:
        print(f"Token Verification Failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Authentication Token: {e}")
