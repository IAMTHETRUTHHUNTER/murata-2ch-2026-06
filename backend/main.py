from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import bcrypt
from database import engine, SessionLocal
import models
from routers import threads as threads_router
from routers import auth as auth_router
from routers import ngwords as ngwords_router


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


app = FastAPI(title="Anonymous BBS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(threads_router.router)
app.include_router(auth_router.router)
app.include_router(ngwords_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
