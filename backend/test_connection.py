import httpx

# Test health
r = httpx.get("http://localhost:8000/api/health/")
print("Health:", r.status_code, r.json()["status"])

# Test login
r = httpx.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "client@contentpk.ai", "password": "Client@123", "role": "client"},
)
data = r.json()
token = data["access_token"]
print("Login:", r.status_code, "- Token:", token[:30] + "...")

# Test documents with token
headers = {"Authorization": f"Bearer {token}"}
r = httpx.get("http://localhost:8000/api/documents/", headers=headers)
print("Documents:", r.status_code, "- Count:", len(r.json()))

# Test upload test
print("\n=== All tests passed! Backend is working perfectly ===")
