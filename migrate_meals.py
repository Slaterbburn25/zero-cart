import sqlite3

def run():
    try:
        conn = sqlite3.connect('backend/zerocart.db')
        conn.execute("ALTER TABLE users ADD COLUMN meal_types_wanted TEXT DEFAULT 'Dinner'")
        # Update user 1 with default string
        conn.execute("UPDATE users SET meal_types_wanted = 'Dinner' WHERE id = 1")
        conn.commit()
        conn.close()
        print("Migrated meal_types successfully")
    except Exception as e:
        print("Migration error:", e)

if __name__ == '__main__':
    run()
