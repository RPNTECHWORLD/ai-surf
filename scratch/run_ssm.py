import boto3
import time
import json

def run_ssm_command(instance_id, commands):
    ssm = boto3.client('ssm')
    print(f"Sending command to {instance_id}: {commands}")
    
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': commands}
    )
    
    command_id = response['Command']['CommandId']
    print(f"Command sent successfully. Command ID: {command_id}")
    
    # Poll for status
    while True:
        time.sleep(1)
        invocation = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id
        )
        status = invocation['Status']
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            print(f"Command finished with status: {status}")
            import sys
            if invocation['StandardErrorContent']:
                print(f"--- Standard Error ---")
                sys.stdout.buffer.write(invocation['StandardErrorContent'].encode('utf-8'))
                print()
            if invocation['StandardOutputContent']:
                print(f"--- Standard Output ---")
                sys.stdout.buffer.write(invocation['StandardOutputContent'].encode('utf-8'))
                print()
            break

def write_file_to_ec2(instance_id, local_path, remote_path):
    import base64
    with open(local_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    b64_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    
    commands = [
        f"echo '{b64_content}' | base64 -d > {remote_path}",
        f"chown ubuntu:ubuntu {remote_path} || true",
        f"ls -la {remote_path}"
    ]
    run_ssm_command(instance_id, commands)

if __name__ == '__main__':
    # 1. Deploy surfers.js
    write_file_to_ec2('i-071d9e5ba6a817feb', 
                      'd:/surfing/ai surf/aquaticxsportssoftware/backend/src/routes/surfers.js', 
                      '/var/www/surfing/backend/src/routes/surfers.js')
    
    # Create and run test_users.js on EC2 to print server.js
    commands = [
        "cat /var/www/surfing/backend/server.js"
    ]
    run_ssm_command('i-071d9e5ba6a817feb', commands)
