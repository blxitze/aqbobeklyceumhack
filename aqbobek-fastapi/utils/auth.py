import os

from dotenv import load_dotenv
from fastapi import HTTPException, Request, status


load_dotenv()


def verify_internal_token(request: Request) -> None:
    internal_secret = os.getenv("INTERNAL_SECRET")
    token = request.headers.get("X-Internal-Token")

    if not token or token != internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal request",
        )
