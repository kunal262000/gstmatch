"""
MODIFIED FILE — replaces: gstmatch-api/gstmatch-api/main.py

Your exact original content is UNCHANGED. Only addition: one import and
one app.include_router() line for the new /api/reconciliation-types
endpoint (marked NEW below).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from api.routes.reconcile import router as reconcile_router
from api.routes.results   import router as results_router
from api.routes.recon_types import router as recon_types_router   # NEW

load_dotenv()

app = FastAPI(
    title       = "GSTMatch API",
    description = "GST Reconciliation engine — 8 reconciliation types across GSTR-2B, 2A, 1, 3B, IMS, 9, 9C, and books",
    version     = "1.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(reconcile_router,    prefix="/api", tags=["Reconciliation"])
app.include_router(results_router,      prefix="/api", tags=["Results"])
app.include_router(recon_types_router,  prefix="/api", tags=["Reconciliation Types"])  # NEW


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "GSTMatch API v1.1.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
