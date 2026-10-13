from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import Alert
from backend.app.models.schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["Continuous Intelligence Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status.upper())
    alerts = query.order_by(Alert.timestamp.desc()).all()
    return alerts

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "ACKNOWLEDGED"
    db.commit()
    return {"status": "success", "alert_id": alert_id, "new_status": "ACKNOWLEDGED"}
