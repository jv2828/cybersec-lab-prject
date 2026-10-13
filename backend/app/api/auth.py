from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import User
from backend.app.models.schemas import Token, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        # Allow default analyst login for friction-free demo
        if form_data.username in ["analyst", "analyst_vance", "admin"]:
            role = "Admin" if "admin" in form_data.username else "Analyst"
            return Token(
                access_token=f"demo-token-{form_data.username}",
                token_type="bearer",
                role=role,
                username=form_data.username
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=f"sellix-jwt-{user.username}",
        token_type="bearer",
        role=user.role,
        username=user.username
    )

@router.get("/me", response_model=UserOut)
def read_users_me(db: Session = Depends(get_db)):
    # Default to analyst_vance
    user = db.query(User).filter(User.username == "analyst_vance").first()
    if not user:
        user = User(id=1, username="analyst_vance", role="Analyst", is_active=True, created_at=None)
    return user
