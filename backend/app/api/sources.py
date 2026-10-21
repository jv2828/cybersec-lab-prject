from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.models import Source
from backend.app.models.schemas import SourceOut

router = APIRouter(prefix="/sources", tags=["Intelligence Sources & Feeds"])

@router.get("", response_model=List[SourceOut])
def list_sources(db: Session = Depends(get_db)):
    """
    Returns list of monitored intelligence sources with reliability scores and trust status.
    """
    return db.query(Source).all()
