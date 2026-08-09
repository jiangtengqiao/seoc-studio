import os
import sys
import ssl
import pg8000.dbapi

if len(sys.argv) != 2:
    raise SystemExit('usage: execute-sql.py <sql-file>')

password = os.environ.get('SEOC_DB_PASSWORD')
if not password:
    raise SystemExit('missing SEOC_DB_PASSWORD')

sql_path = sys.argv[1]
with open(sql_path, 'r', encoding='utf-8') as f:
    sql = f.read()

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE
conn = pg8000.dbapi.connect(
    user='postgres.hjmgwlxohxinqhwxdspf',
    password=password,
    host='aws-0-ap-southeast-1.pooler.supabase.com',
    port=5432,
    database='postgres',
    ssl_context=context,
    timeout=30,
)
cur = conn.cursor()
try:
    cur.execute(sql)
    conn.commit()
    print('SQL executed successfully')
finally:
    cur.close()
    conn.close()
