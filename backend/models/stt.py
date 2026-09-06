from pydantic import BaseModel


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration: float
    model: str
