from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import require_admin
import crud
import schemas
import models

router = APIRouter(prefix="/ngwords", tags=["ngwords"])


@router.get("/", response_model=list[schemas.NGWordOut])
def get_ngwords(
    db: Session = Depends(get_db),
    _: models.AdminSession = Depends(require_admin),
):
    return crud.get_ngwords(db)


@router.post("/", response_model=schemas.NGWordOut, status_code=201)
def add_ngword(
    body: schemas.NGWordCreate,
    db: Session = Depends(get_db),
    _: models.AdminSession = Depends(require_admin),
):
    try:
        return crud.add_ngword(db, body.word)
    except ValueError as e:
        if str(e) == "duplicate_word":
            raise HTTPException(status_code=409, detail="duplicate_word")
        raise HTTPException(status_code=500, detail="Failed to add NGword")


@router.delete("/{ngword_id}", status_code=204)
def delete_ngword(
    ngword_id: int,
    db: Session = Depends(get_db),
    _: models.AdminSession = Depends(require_admin),
):
    try:
        crud.delete_ngword(db, ngword_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="NGword not found")
