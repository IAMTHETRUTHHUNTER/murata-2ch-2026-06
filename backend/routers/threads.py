from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from database import get_db
import crud
import schemas

router = APIRouter(prefix="/threads", tags=["threads"])

_SESSION_COOKIE = "bbs_session"
_SESSION_MAX_AGE = 60 * 60 * 24 * 365  # 1 year


def _get_or_create_session(request: Request, response: Response) -> str:
    session_id = request.cookies.get(_SESSION_COOKIE)
    if not session_id:
        session_id = str(uuid4())
        response.set_cookie(
            _SESSION_COOKIE,
            session_id,
            httponly=True,
            samesite="lax",
            max_age=_SESSION_MAX_AGE,
        )
    return session_id


@router.get("/", response_model=list[schemas.ThreadListItem])
def get_threads(sort: str = "newest", db: Session = Depends(get_db)):
    return crud.get_threads(db, sort)


@router.post("/", response_model=schemas.ThreadCreated, status_code=201)
def create_thread(
    body: schemas.ThreadCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    session_id = _get_or_create_session(request, response)
    try:
        thread_id = crud.create_thread(
            db, body.title, body.name, body.email, body.content, session_id
        )
        return {"id": thread_id}
    except ValueError as e:
        if str(e) == "thread_rate_limit":
            raise HTTPException(status_code=429, detail="thread_rate_limit")
        raise HTTPException(status_code=500, detail="Failed to create thread")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create thread")


@router.get("/{thread_id}", response_model=schemas.ThreadDetail)
def get_thread(thread_id: int, db: Session = Depends(get_db)):
    thread = crud.get_thread_detail(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@router.post("/{thread_id}/comments", response_model=schemas.CommentOut)
def post_comment(
    thread_id: int,
    body: schemas.CommentCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    session_id = _get_or_create_session(request, response)
    try:
        return crud.create_comment(
            db, thread_id, body.name, body.email, body.content, session_id
        )
    except ValueError as e:
        msg = str(e)
        if msg == "thread_not_found":
            raise HTTPException(status_code=404, detail="Thread not found")
        if msg == "comment_limit":
            raise HTTPException(status_code=409, detail="comment_limit")
        if msg == "rate_limit":
            raise HTTPException(status_code=429, detail="rate_limit")
        raise HTTPException(status_code=500, detail="Internal server error")
