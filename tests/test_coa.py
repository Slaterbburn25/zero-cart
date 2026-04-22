from logic.bigquery_client import ZeroCartBQ

print("Initializing COA BigQuery Interface...")
bq = ZeroCartBQ()

print("Simulating the COA telling the Supply Chain Director to feed Dave...")
mission_id = bq.shout_order("IDEATE", {"user_id": 1, "target": "Blackburn_Tesco"})

print(f"\nVerifying Queued Mail from Director perspective...")
pending = bq.check_for_mail()
for task in pending:
    print(f"- Task Found: {task['task_type']} | Status: {task['status']} | Payload: {task['payload']}")
