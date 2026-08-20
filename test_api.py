import sys
sys.path.insert(0, r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
response = client.get('/api/reconciliation-types')
print('Status:', response.status_code)
print('Types:', len(response.json()))
for t in response.json():
    print(f'  - {t["id"]}: {t["name"]} ({t["engine"]})')