import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import app

client = app.test_client()

print("Testing /api/swimmer/316250")
response = client.get('/api/swimmer/316250')
print("Status Code:", response.status_code)
if response.status_code == 200:
    print("Success! Data:")
    data = response.get_json()
    print("Name:", data.get('swimmer_name'))
    print("Total Score:", data.get('total_score'))
else:
    print("Failed:")
    print(response.get_data(as_text=True))
