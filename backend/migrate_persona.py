import sqlite3

def migrate():
    print("Executing SQLite Migration for AAA Persona Features...")
    conn = sqlite3.connect('../zerocart.db')
    cursor = conn.cursor()
    
    # Try adding each Persona column dynamically
    columns_to_add = [
        ("primary_goal", "TEXT", "'Balanced'"),
        ("preferred_meats", "TEXT", "'Any'"),
        ("hated_foods", "TEXT", "'none'")
    ]
    
    for col_name, col_type, default_val in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type} DEFAULT {default_val}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Failed to add {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration finished!")

if __name__ == "__main__":
    migrate()
