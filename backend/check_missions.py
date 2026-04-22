from logic.bigquery_client import ZeroCartBQ
import json

bq = ZeroCartBQ()
missions = bq.client.query(f"SELECT mission_id, status, payload FROM `{bq.table_id}` WHERE task_type='SCRAPE' ORDER BY created_at DESC LIMIT 1").result()

for m in missions:
    print(f"Status: {m['status']}")
    print(f"Payload: {str(m['payload'])}")
