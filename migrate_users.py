import sqlite3

def run():
    try:
        conn = sqlite3.connect('backend/zerocart.db')
        conn.execute("ALTER TABLE users ADD COLUMN calorie_limit INTEGER")
        conn.execute("ALTER TABLE users ADD COLUMN family_size INTEGER DEFAULT 1")
        conn.execute("ALTER TABLE users ADD COLUMN meals_per_day INTEGER DEFAULT 3")
        conn.execute("ALTER TABLE users ADD COLUMN preferred_store TEXT DEFAULT 'Tesco Live'")
        
        # update the test user with default bounds
        conn.execute("UPDATE users SET calorie_limit = 2200, family_size = 1, meals_per_day = 3, preferred_store = 'Tesco Live' WHERE id = 1")
        conn.commit()
        conn.close()
        print("Migrated users successfully")
    except Exception as e:
        print("Migration likely already run:", e)

if __name__ == '__main__':
    run()
