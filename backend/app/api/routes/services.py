from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models import Service
from app.schemas import ServiceOut
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=List[ServiceOut])
async def list_services(
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await session.execute(select(Service).where(Service.is_active == True))
    return result.scalars().all()


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(
    service_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = await session.get(Service, service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
