from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from database import Base
from sqlalchemy.orm import relationship
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True)   # ✅ ADD THIS


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)
    owner_email = Column(String, nullable=False)
