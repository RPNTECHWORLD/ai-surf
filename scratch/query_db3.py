import boto3
from sqlalchemy import create_engine
from urllib.parse import quote_plus

db_host = 'database-3-instance-1.ckl2omi0klbx.us-east-1.rds.amazonaws.com'
db_port = 5432
db_user = 'postgres'
db_name = 'postgres'

token = boto3.client('rds', region_name='us-east-1').generate_db_auth_token(
    DBHostname=db_host,
    Port=db_port,
    DBUsername=db_user,
    Region='us-east-1'
)

connection_uri = f'postgresql+psycopg2://{db_user}:{quote_plus(token)}@{db_host}:{db_port}/{db_name}'
engine = create_engine(connection_uri, connect_args={'sslmode': 'require'})

with engine.connect() as conn:
    cursor = conn.connection.cursor()
    
    # Check if table exists
    cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students')")
    has_students = cursor.fetchone()[0]
    print("has_students table:", has_students)
    
    if has_students:
        cursor.execute('SELECT COUNT(*) FROM students')
        print("students count:", cursor.fetchone()[0])
        cursor.execute('SELECT id, name FROM students LIMIT 3')
        print("sample students:", cursor.fetchall())
        
    cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surfers')")
    has_surfers = cursor.fetchone()[0]
    print("has_surfers table:", has_surfers)
    if has_surfers:
        cursor.execute('SELECT COUNT(*) FROM surfers')
        print("surfers count:", cursor.fetchone()[0])
        cursor.execute('SELECT id, name FROM surfers LIMIT 3')
        print("sample surfers:", cursor.fetchall())
