from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from api.routes.reconcile import router as reconcile_router
from api.routes.results   import router as results_router

load_dotenv()

app = FastAPI(
    title       = "GSTMatch API",
    description = "GST Reconciliation engine — matches Purchase Register vs GSTR-2B",
    version     = "1.0.0",
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
app.include_router(reconcile_router, prefix="/api", tags=["Reconciliation"])
app.include_router(results_router,   prefix="/api", tags=["Results"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "GSTMatch API v1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
