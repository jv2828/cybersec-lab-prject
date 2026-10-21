import pytest
from sqlalchemy.orm import Session
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.seed.generator import seed_database
from backend.app.models.models import Actor

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Session-level fixture that guarantees the database schema is created
    and seeded deterministically before any test executes.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Actor).count()
        if count == 0:
            seed_database(db, seed_val=42)
    finally:
        db.close()
    yield
