from google.cloud import bigquery

def setup_missions_table():
    client = bigquery.Client(project="zero-cart-493517")
    dataset_id = "zerocart_v1" # The one you just made
    table_id = f"{client.project}.{dataset_id}.missions"

    # Define the schema for agent communication
    schema = [
        bigquery.SchemaField("mission_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("status", "STRING", mode="REQUIRED"), # PENDING, SUCCESS, FAILED
        bigquery.SchemaField("task_type", "STRING", mode="REQUIRED"), # IDEATE, SCRAPE, RESTOCK
        bigquery.SchemaField("payload", "JSON", mode="NULLABLE"), # The actual data for the drone
    ]

    table = bigquery.Table(table_id, schema=schema)
    
    try:
        table = client.create_table(table)  # API request
        print(f"✅ Created table {table.project}.{table.dataset_id}.{table.table_id}")
    except Exception as e:
        print(f"⚠️ Table probably already exists or you broke something: {e}")

if __name__ == "__main__":
    setup_missions_table()
