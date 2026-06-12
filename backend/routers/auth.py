from uuid import uuid4
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

# タイミング攻撃対策: IDが存在しない場合もbcrypt処理時間を均一化するためのダミーハッシュ
_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt()).decode()

_ADMIN_TOKEN_COOKIE = "admin_token"
_ADMIN_TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours


def get_admin_session(request: Request, db: Session) -> models.AdminSession | None:
    token = request.cookies.get(_ADMIN_TOKEN_COOKIE)
    if not token:
        return None
    return (
        db.query(models.AdminSession)
        .filter(models.AdminSession.token == token)
        .first()
    )


def require_admin(request: Request, db: Session = Depends(get_db)) -> models.AdminSession:
    session = get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return session


@router.post("/login")
def login(
    body: schemas.AdminLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    admin = (
        db.query(models.Admin)
        .filter(models.Admin.login_id == body.login_id)
        .first()
    )
    hash_to_check = admin.password_hash if admin else _DUMMY_HASH
    password_ok = bcrypt.checkpw(body.password.encode(), hash_to_check.encode())
    if not admin or not password_ok:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    token = str(uuid4())
    db.add(models.AdminSession(token=token))
    db.commit()

    response.set_cookie(
        _ADMIN_TOKEN_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        max_age=_ADMIN_TOKEN_MAX_AGE,
    )
    return {"message": "ok"}


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    token = request.cookies.get(_ADMIN_TOKEN_COOKIE)
    if token:
        db.query(models.AdminSession).filter(
            models.AdminSession.token == token
        ).delete()
        db.commit()
    response.delete_cookie(_ADMIN_TOKEN_COOKIE)
    return {"message": "ok"}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    session = get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return {"authenticated": True}
