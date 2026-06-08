import hashlib
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
import models
from models import now_jst

MAX_THREADS = 200
MAX_COMMENTS = 1000
RATE_LIMIT_SECONDS = 20
THREAD_RATE_LIMIT_SECONDS = 60


# ── Thread list ────────────────────────────────────────────

def get_threads(db: Session, sort: str = "newest") -> list[dict]:
    query = (
        db.query(
            models.Thread,
            func.count(models.Comment.id).label("comment_count"),
        )
        .outerjoin(models.Comment)
        .group_by(models.Thread.id)
    )

    if sort == "oldest":
        query = query.order_by(asc(models.Thread.updated_at))
    else:
        query = query.order_by(desc(models.Thread.updated_at))

    return [
        {
            "id": t.id,
            "title": t.title,
            "updated_at": t.updated_at,
            "comment_count": count,
        }
        for t, count in query.all()
    ]


# ── Create thread ──────────────────────────────────────────

def _check_thread_rate_limit(db: Session, session_id: str) -> bool:
    cutoff = now_jst() - timedelta(seconds=THREAD_RATE_LIMIT_SECONDS)
    recent = (
        db.query(models.Comment)
        .filter(
            models.Comment.session_id == session_id,
            models.Comment.number == 1,
            models.Comment.created_at > cutoff,
        )
        .first()
    )
    return recent is None


def create_thread(
    db: Session,
    title: str,
    name: str,
    email: str,
    content: str,
    session_id: str,
) -> int:
    if not _check_thread_rate_limit(db, session_id):
        raise ValueError("thread_rate_limit")

    actual_name = "名無しさん"
    trip = ""
    if "#" in name:
        parts = name.split("#", 1)
        actual_name = parts[0].strip() or "名無しさん"
        trip = _generate_trip(parts[1])
    elif name.strip():
        actual_name = name.strip()

    date_str = now_jst().strftime("%Y-%m-%d")
    user_id = _generate_user_id(session_id, date_str)

    thread = models.Thread(title=title)
    db.add(thread)
    db.flush()  # get thread.id

    comment = models.Comment(
        thread_id=thread.id,
        number=1,
        name=actual_name,
        email=email,
        trip=trip,
        content=content,
        session_id=session_id,
        user_id=user_id,
    )
    db.add(comment)
    db.commit()

    purge_old_threads(db)

    return thread.id


def purge_old_threads(db: Session) -> None:
    count = db.query(models.Thread).count()
    if count > MAX_THREADS:
        excess = count - MAX_THREADS
        oldest = (
            db.query(models.Thread)
            .order_by(asc(models.Thread.updated_at))
            .limit(excess)
            .all()
        )
        for thread in oldest:
            db.delete(thread)
        db.commit()


# ── NGWords ────────────────────────────────────────────────

def get_ngwords(db: Session) -> list[models.NGWord]:
    return (
        db.query(models.NGWord)
        .order_by(desc(models.NGWord.created_at))
        .all()
    )


def add_ngword(db: Session, word: str) -> models.NGWord:
    from sqlalchemy.exc import IntegrityError
    ng = models.NGWord(word=word)
    db.add(ng)
    try:
        db.commit()
        db.refresh(ng)
        return ng
    except IntegrityError:
        db.rollback()
        raise ValueError("duplicate_word")


def delete_ngword(db: Session, ngword_id: int) -> None:
    ng = db.query(models.NGWord).filter(models.NGWord.id == ngword_id).first()
    if not ng:
        raise ValueError("not_found")
    db.delete(ng)
    db.commit()


# ── Thread detail ──────────────────────────────────────────

def _get_ng_words(db: Session) -> list[str]:
    return [w.word for w in db.query(models.NGWord).all()]


def get_thread_detail(db: Session, thread_id: int) -> dict | None:
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        return None

    ng_words = _get_ng_words(db)

    comments_out = []
    for c in sorted(thread.comments, key=lambda x: x.number):
        is_abone = bool(ng_words) and any(w in c.content for w in ng_words)
        comments_out.append(
            {
                "id": c.id,
                "number": c.number,
                "name": c.name,
                "email": c.email,
                "trip": c.trip,
                "user_id": c.user_id,
                "content": c.content,
                "created_at": c.created_at,
                "is_abone": is_abone,
            }
        )

    return {
        "id": thread.id,
        "title": thread.title,
        "created_at": thread.created_at,
        "comments": comments_out,
    }


# ── Comment creation helpers ───────────────────────────────

def _generate_user_id(session_id: str, date_str: str) -> str:
    raw = f"{session_id}{date_str}"
    return hashlib.sha256(raw.encode()).hexdigest()[:8]


def _generate_trip(key: str) -> str:
    return "◆" + hashlib.sha256(key.encode()).hexdigest()[:10]


def _check_rate_limit(db: Session, session_id: str) -> bool:
    cutoff = now_jst() - timedelta(seconds=RATE_LIMIT_SECONDS)
    recent = (
        db.query(models.Comment)
        .filter(
            models.Comment.session_id == session_id,
            models.Comment.created_at > cutoff,
        )
        .first()
    )
    return recent is None


# ── Create comment ─────────────────────────────────────────

def create_comment(
    db: Session,
    thread_id: int,
    name: str,
    email: str,
    content: str,
    session_id: str,
) -> dict:
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise ValueError("thread_not_found")

    comment_count = (
        db.query(func.count(models.Comment.id))
        .filter(models.Comment.thread_id == thread_id)
        .scalar()
    )
    if comment_count >= MAX_COMMENTS:
        raise ValueError("comment_limit")

    if not _check_rate_limit(db, session_id):
        raise ValueError("rate_limit")

    # Parse name and trip
    actual_name = "名無しさん"
    trip = ""
    if "#" in name:
        parts = name.split("#", 1)
        actual_name = parts[0].strip() or "名無しさん"
        trip = _generate_trip(parts[1])
    elif name.strip():
        actual_name = name.strip()

    date_str = now_jst().strftime("%Y-%m-%d")
    user_id = _generate_user_id(session_id, date_str)

    max_number = (
        db.query(func.max(models.Comment.number))
        .filter(models.Comment.thread_id == thread_id)
        .scalar()
        or 0
    )

    comment = models.Comment(
        thread_id=thread_id,
        number=max_number + 1,
        name=actual_name,
        email=email,
        trip=trip,
        content=content,
        session_id=session_id,
        user_id=user_id,
    )
    db.add(comment)

    is_sage = email.lower() == "sage"
    if not is_sage:
        thread.updated_at = now_jst()

    db.commit()
    db.refresh(comment)

    ng_words = _get_ng_words(db)
    is_abone = bool(ng_words) and any(w in comment.content for w in ng_words)

    return {
        "id": comment.id,
        "number": comment.number,
        "name": comment.name,
        "email": comment.email,
        "trip": comment.trip,
        "user_id": comment.user_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "is_abone": is_abone,
    }
