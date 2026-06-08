from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ThreadListItem(BaseModel):
    id: int
    title: str
    updated_at: datetime
    comment_count: int

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: int
    number: int
    name: str
    email: str
    trip: str
    user_id: str
    content: str
    created_at: datetime
    is_abone: bool

    model_config = {"from_attributes": True}


class ThreadDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    comments: list[CommentOut]

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    name: str = Field(default="", max_length=50)
    email: str = Field(default="", max_length=254)
    content: str = Field(max_length=1000)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content is required")
        return v


class ThreadCreate(BaseModel):
    title: str = Field(max_length=256)
    name: str = Field(default="", max_length=50)
    email: str = Field(default="", max_length=254)
    content: str = Field(max_length=1000)

    @field_validator("title", "content")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field is required")
        return v


class ThreadCreated(BaseModel):
    id: int


class AdminLoginRequest(BaseModel):
    login_id: str
    password: str


class NGWordOut(BaseModel):
    id: int
    word: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NGWordCreate(BaseModel):
    word: str = Field(max_length=50)

    @field_validator("word")
    @classmethod
    def word_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("word is required")
        return v
