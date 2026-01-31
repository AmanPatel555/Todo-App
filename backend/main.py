from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
from datetime import datetime
from database import SessionLocal, engine
from models import User, Todo, Base
from schemas import (
    UserCreate,
    UserLogin,
    TodoCreate,
    TodoOut,
    TodoUpdate,
    ProfileUpdate,
    TodoBase
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# ================= STATIC & TEMPLATES =================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ================= MIDDLEWARE =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= DB =================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ================= PAGES =================
@app.get("/", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/todo.html", response_class=HTMLResponse)
def todo_page(request: Request):
    return templates.TemplateResponse("todo.html", {"request": request})

@app.get("/profile.html", response_class=HTMLResponse)
def profile_page(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

# ================= AUTH =================
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="User exists")

    new_user = User(
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    return {"message": "Signup successful"}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer"}

# ================= PROFILE =================
@app.get("/me")
def get_profile(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email": user.email,
        "name": user.name
    }


@app.put("/me")
def update_profile(
    data: ProfileUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.name = data.name
    db.commit()
    return {"message": "Profile updated"}


# ================= TODOS =================
@app.post("/todos")
def create_todo(
    todo: TodoCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_todo = Todo(
        title=todo.title,
        due_date=todo.due_date,   # ✅ NEW
        owner_email=current_user
    )
    db.add(new_todo)
    db.commit()
    return {"message": "Todo added"}


@app.get("/todos", response_model=list[TodoOut])
def get_todos(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Todo).filter(
    Todo.owner_email == current_user
).order_by(Todo.due_date.is_(None), Todo.due_date).all()

@app.put("/todos/{todo_id}")
def toggle_todo(
    todo_id: int,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.owner_email == current_user
    ).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    todo.completed = not todo.completed
    db.commit()
    return {"message": "Todo updated"}

@app.put("/todos/{todo_id}/edit")
def edit_todo(
    todo_id: int,
    data: TodoUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.owner_email == current_user
    ).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    todo.title = data.title
    todo.due_date = data.due_date 
    db.commit()
    return {"message": "Todo updated"}

@app.delete("/todos/{todo_id}")
def delete_todo(
    todo_id: int,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.owner_email == current_user
    ).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(todo)
    db.commit()
    return {"message": "Todo deleted"}
