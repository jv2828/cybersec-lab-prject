import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.seed.generator import seed_database
from backend.app.models.models import HiddenService

# Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.services import router as services_router
from backend.app.api.graph import router as graph_router
from backend.app.api.actors import router as actors_router
from backend.app.api.pivots import router as pivots_router
from backend.app.api.cases import router as cases_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.search import router as search_router
from backend.app.api.stats import router as stats_router
from backend.app.api.pipeline import router as pipeline_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed if database is unseeded
    db = SessionLocal()
    count = db.query(HiddenService).count()
    if count == 0:
        print("[Sellix Trace] Initializing deterministic synthetic seed data...")
        seed_database(db)
    db.close()
    yield

app = FastAPI(
    title="Sellix Trace Threat Intelligence Platform API",
    description="Law-enforcement-grade platform de-anonymizing dark web threat actors via hidden service misconfigurations, cross-marketplace entity resolution, and real-world infrastructure linking.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(services_router, prefix=settings.API_V1_STR)
app.include_router(graph_router, prefix=settings.API_V1_STR)
app.include_router(actors_router, prefix=settings.API_V1_STR)
app.include_router(pivots_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(stats_router, prefix=settings.API_V1_STR)
app.include_router(pipeline_router, prefix=settings.API_V1_STR)

# Serve landing page at root "/"
@app.get("/", include_in_schema=False)
def get_landing_page():
    landing_path = os.path.join(os.path.dirname(__file__), "..", "index.html")
    if os.path.exists(landing_path):
        return FileResponse(landing_path)
    return {"message": "Sellix Trace API Online. Access /docs for OpenAPI documentation."}

# Serve Vite frontend app if built
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    @app.get("/app", include_in_schema=False)
    def redirect_app():
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/app/")

    app.mount("/app", StaticFiles(directory=frontend_dist, html=True), name="frontend_app")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
