from typing import ClassVar, final


@final
class BotInfo:
    bot_url: ClassVar[str] = ""
    username: ClassVar[str] = ""

    @classmethod
    def build_mini_app_url(cls) -> str:
        return f"{cls.bot_url}?startapp"

    @classmethod
    def build_start_invitation(cls, group_invite_code: str) -> str:
        return f"{cls.bot_url}?start=invite_{group_invite_code}"
