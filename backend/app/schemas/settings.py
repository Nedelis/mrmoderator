from app.schemas.base import BaseSchema


class SettingsSchema(BaseSchema):
    model_config = {**BaseSchema.model_config, "extra": "allow"}

    push_notifications: bool = True
    daily_summary: bool = True
    debt_notifications: bool = True
    new_materials: bool = False
    two_factor: bool = True
    audit_log: bool = True
