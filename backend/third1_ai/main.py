
from fastapi import FastAPI

from backend.third1_ai.api.routes import router as cases_router


app = FastAPI(
    title="Third1 AI Backend",
    description="Multi-agent AI referee for everyday disagreements.",
    version="0.1.0",
)

app.include_router(cases_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "third1-ai-backend",
        "message": "Third1 AI backend is running.",
    }
