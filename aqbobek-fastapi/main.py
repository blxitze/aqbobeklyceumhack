from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ai import router as ai_router
from routers.schedule import router as schedule_router


app = FastAPI(title="Aqbobek Lyceum API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/ai")
app.include_router(schedule_router, prefix="/schedule")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "aqbobek-fastapi"}


@app.on_event("startup")
def startup_event() -> None:
    print("FastAPI started, connected to DB")
