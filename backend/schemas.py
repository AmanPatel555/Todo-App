from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# ---------- USER ----------
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):  
    email: str
    password: str

# ---------- TODO ----------
class TodoCreate(BaseModel):
    title: str

class TodoOut(BaseModel):
    id: int
    title: str
    completed: bool

    class Config:
        from_attributes = True

class TodoUpdate(BaseModel):
    title: str
    due_date: Optional[datetime] = None 

class ProfileUpdate(BaseModel):
    name: str

class TodoBase(BaseModel):
    title: str
    due_date: Optional[datetime] = None

class TodoCreate(TodoBase):
    pass

class TodoResponse(TodoBase):
    id: int
    completed: bool

    class Config:
        orm_mode = True

class TodoOut(TodoBase):
    id: int
    completed: bool

    class Config:
        orm_mode = True