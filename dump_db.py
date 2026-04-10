import sqlite3
conn = sqlite3.connect('backend/zerocart.db')
cur = conn.cursor()
cur.execute("SELECT item_name, price, sku FROM local_deals;" )
for row in cur.fetchall():
    print(row)
conn.close()
