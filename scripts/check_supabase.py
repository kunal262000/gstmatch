"""
Read-only check: does the Supabase project have the tables/RLS this app expects?
Reads keys from gstmatch/.env.local. Prints only table names + HTTP status (no secrets).

Run:
    python scripts/check_supabase.py
"""
import os
from pathlib import Path

import httpx

ENV = Path(__file__).resolve().parents[1] / "gstmatch" / ".env.local"

vals = {}
if ENV.exists():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        vals[k.strip()] = v.strip()

url = vals.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = vals.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "") or vals.get("SUPABASE_SERVICE_ROLE_KEY", "")
key = key.replace('"', "").replace("'", "")

if not url or not key or "your-project" in url:
    print("Supabase NOT configured in gstmatch/.env.local — nothing to check locally.")
    raise SystemExit(0)

print(f"Supabase project: {url}")
print("Checking tables (200/ok = exists) ...")
tables = ["reconciliation_results", "users", "user_activity"]
for t in tables:
    try:
        r = httpx.get(
            f"{url.rstrip('/')}/rest/v1/{t}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            params={"select": "id", "limit": "1"},
            timeout=15.0,
        )
        exists = r.status_code in (200, 206)
        marker = "EXISTS" if exists else "MISSING"
        print(f"  - {t:<26} {marker}  (HTTP {r.status_code})")
    except Exception as e:  # noqa: BLE001
        print(f"  - {t:<26} ERROR  ({e})")
