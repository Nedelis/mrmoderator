from typing import Literal
from app.schemas.base import BaseSchema


MaterialType = Literal["pdf", "video", "other"]


class Material(BaseSchema):
    id: str
    title: str
    author: str
    type: MaterialType
    created_at: str


class UploadMaterialRequest(BaseSchema):
    title: str
    type: MaterialType
