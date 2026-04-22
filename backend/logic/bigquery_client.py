from google.cloud import bigquery
from datetime import datetime
import json

class ZeroCartBQ:
    def __init__(self):
        self.client = bigquery.Client(project="zero-cart-493517")
        # Ensure this matches the dataset you manually created
        self.table_id = f"{self.client.project}.zerocart_v1.missions"

    def shout_order(self, task_type: str, payload: dict):
        """
        Commands the business using DML INSERT. 
        Swapped JSON_PARSE for PARSE_JSON to fix syntax error.
        """
        mission_id = f"{task_type.lower()}_{int(datetime.now().timestamp())}"
        
        # SQL fix: PARSE_JSON is the correct GoogleSQL function
        query = f"""
            INSERT INTO `{self.table_id}` (mission_id, created_at, status, task_type, payload)
            VALUES (@mission_id, CURRENT_TIMESTAMP(), 'PENDING', @task_type, PARSE_JSON(@payload))
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("mission_id", "STRING", mission_id),
                bigquery.ScalarQueryParameter("task_type", "STRING", task_type),
                bigquery.ScalarQueryParameter("payload", "STRING", json.dumps(payload)),
            ]
        )
        
        self.client.query(query, job_config=job_config).result()
        print(f"[SHOUT] Mission {mission_id} broadcasted via DML.")
        return mission_id

    def check_for_mail(self):
        """Checks for missions that haven't been picked up yet."""
        query = f"SELECT * FROM `{self.table_id}` WHERE status = 'PENDING' ORDER BY created_at ASC"
        query_job = self.client.query(query)
        results = []
        for row in query_job:
            results.append(dict(row))
        return results

    def update_mission_status(self, mission_id: str, status: str, result_payload: dict = None):
        """Moves the mission through the pipeline. Fixed PARSE_JSON here too."""
        query = f"""
            UPDATE `{self.table_id}`
            SET status = @status, 
                payload = PARSE_JSON(@payload)
            WHERE mission_id = @mission_id
        """
        # Maintain state if no new payload is provided
        current_payload = json.dumps(result_payload) if result_payload else "{}"
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("status", "STRING", status),
                bigquery.ScalarQueryParameter("payload", "STRING", current_payload),
                bigquery.ScalarQueryParameter("mission_id", "STRING", mission_id),
            ]
        )
        self.client.query(query, job_config=job_config).result()
        print(f"[UPDATE] Mission {mission_id} moved to: {status}")
