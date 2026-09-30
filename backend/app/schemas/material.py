from typing import Literal

from app.schemas.base import BaseSchema

MaterialType = Literal["pdf", "video", "other"]


class Material(BaseSchema):
    id: str
    title: str
    author: str
    type: MaterialType
    created_at: str
    # Ссылка, по которой материал открывается (файл в MAX или облаке)
    max_url: str | None = None


class UploadMaterialRequest(BaseSchema):
    title: str
    type: MaterialType
    url: str
