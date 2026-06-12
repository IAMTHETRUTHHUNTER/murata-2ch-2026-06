import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import bcrypt
from database import engine, SessionLocal
import models
from routers import threads as threads_router
from routers import auth as auth_router
from routers import ngwords as ngwords_router

_is_production = os.getenv("ENV") == "production"


class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers += [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"content-security-policy", b"default-src 'self'"),
                ]
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def init_db():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(models.Admin).filter(models.Admin.login_id == "admin").first()
        if not admin:
            db.add(
                models.Admin(
                    login_id="admin",
                    password_hash=hash_password("Admin1234"),
                )
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Anonymous BBS API",
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    sanitized = [
        {k: v for k, v in error.items() if k not in ("input", "ctx")}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": sanitized})


app.include_router(threads_router.router)
app.include_router(auth_router.router)
app.include_router(ngwords_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
