import urllib.request
import urllib.error
import json

url = 'https://employee-worktrack-2.onrender.com/api/auth/login'
data = json.dumps({'employee_email': 'admin@worktrack.com', 'employee_password': 'admin123'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print('SUCCESS:', response.getcode(), response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code, e.read().decode('utf-8'))
except Exception as e:
    print('ERROR:', str(e))
