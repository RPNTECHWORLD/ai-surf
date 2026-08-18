import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

instance_id = 'i-0c62e04f44a9ea237'
commands = [
    'cd /home/ec2-user/backend',
    '''sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python3 -c "
import os
import psycopg2

conn = psycopg2.connect(
    host='database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com',
    port=5432,
    database='postgres',
    user='postgres',
    password='',
    sslmode='require'
)
cur = conn.cursor()

# Add missing columns to mock_heats
migrations = [
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS coach_id INTEGER REFERENCES instructors(id)\\\",
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS date VARCHAR DEFAULT to_char(now(), \'YYYY-MM-DD HH24:MI:SS\')\\\",
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS duration_mins INTEGER DEFAULT 20\\\",
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS strategy_execution TEXT DEFAULT \\'\\'\\\",
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS heat_total FLOAT DEFAULT 0.0\\\",
    \\\"ALTER TABLE mock_heats ADD COLUMN IF NOT EXISTS wave_progression TEXT DEFAULT \\'[]\\'\\\"
]

for sql in migrations:
    try:
        cur.execute(sql)
        print(f\'OK: {sql[:60]}\')
    except Exception as e:
        print(f\'SKIP: {e}\')

conn.commit()
cur.close()
conn.close()
print(\'Migration complete!\')
"
'''
]

print("Running migration on AWS RDS via EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"CommandId: {command_id}")

while True:
    invocations = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if invocations['CommandInvocations']:
        status = invocations['CommandInvocations'][0]['Status']
        print(f"Status: {status}")
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            plugins = invocations['CommandInvocations'][0]['CommandPlugins']
            for plugin in plugins:
                print(f"Plugin: {plugin['Name']} ({plugin['Status']})")
                output = plugin.get('Output', '').encode('ascii', 'ignore').decode('ascii')
                print(output)
            break
    time.sleep(2)
