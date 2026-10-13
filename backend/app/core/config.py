import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sellix Trace"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sellix-trace-super-secret-dev-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sellix_trace.db")
    
    # Crawler guardrails
    TOR_CRAWLER_ENABLED: bool = os.getenv("TOR_CRAWLER_ENABLED", "false").lower() == "true"
    TOR_SOCKS_PROXY: str = os.getenv("TOR_SOCKS_PROXY", "socks5://127.0.0.1:9050")
    AUTHORIZED_INVESTIGATION_FLAG: bool = os.getenv("AUTHORIZED_INVESTIGATION_FLAG", "false").lower() == "true"
    
    # Demo and Seed
    SYNTHETIC_DATA_ONLY: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
