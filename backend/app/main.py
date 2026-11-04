from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.routers import auth, public, registrations, schedule, users, workshops

settings = get_settings()

# ── Rate limiter (shared instance) ────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MyPFE Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# ── Request body size cap ─────────────────────────────────────────────────────
@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.max_request_body_bytes:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Request body too large"},
        )
    return await call_next(request)


# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting middleware ───────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Routers ────────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(public.router, prefix=PREFIX)
app.include_router(auth.router, prefix=PREFIX)
app.include_router(schedule.router, prefix=PREFIX)
app.include_router(workshops.router, prefix=PREFIX)
app.include_router(registrations.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
