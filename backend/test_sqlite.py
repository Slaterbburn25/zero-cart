import sqlite3

try:
    conn = sqlite3.connect('../zerocart.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("User Columns:", [col[1] for col in columns])
except Exception as e:
    print("Error:", e)
