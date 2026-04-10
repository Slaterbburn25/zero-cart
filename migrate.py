import sqlite3

def run():
    try:
        conn = sqlite3.connect('backend/zerocart.db')
        conn.execute("ALTER TABLE local_deals ADD COLUMN item_url TEXT DEFAULT ''")
        conn.commit()
        conn.close()
        print("Migrated successfully")
    except Exception as e:
        print("Migration likely already run:", e)

if __name__ == '__main__':
    run()
