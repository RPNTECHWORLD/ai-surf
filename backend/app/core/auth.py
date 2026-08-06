import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

security = HTTPBearer()

# Shared JWT secret or RS256 Public Key
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", process_env_jwt_key := "aquaticxsports_shared_jwt_secret_2026")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

async function verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub") or payload.get("id")
        email: str = payload.get("email")
        role: str = payload.get("role") or payload.get("user_type")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing user subject",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "payload": payload
        }
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
