import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "expenses.json")

app = FastAPI(title="Personal Expenses Tracker")

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


class Expense(BaseModel):
    category: str
    amount: float


def load_expenses():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_expenses(expenses):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(expenses, f, indent=4)


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/expenses")
def get_all_expenses():
    return load_expenses()


@app.post("/api/expenses")
def add_expense(expense: Expense):
    category = expense.category.strip().lower()
    if not category:
        raise HTTPException(status_code=400, detail="Category cannot be empty")
    if expense.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    expenses = load_expenses()
    expenses[category] = expenses.get(category, 0) + expense.amount
    save_expenses(expenses)
    return {"message": "Expense added successfully", "category": category, "amount": expenses[category]}


@app.get("/api/expenses/{category}")
def search_expense(category: str):
    expenses = load_expenses()
    key = category.strip().lower()
    if key in expenses:
        return {"category": key, "amount": expenses[key]}
    raise HTTPException(status_code=404, detail="Expense category not found")


@app.get("/api/report")
def monthly_report():
    expenses = load_expenses()
    if not expenses:
        return {"expenses": {}, "total": 0, "count": 0}
    total = sum(expenses.values())
    return {"expenses": expenses, "total": total, "count": len(expenses)}


@app.delete("/api/expenses/{category}")
def delete_expense(category: str):
    expenses = load_expenses()
    key = category.strip().lower()
    if key not in expenses:
        raise HTTPException(status_code=404, detail="Expense category not found")
    del expenses[key]
    save_expenses(expenses)
    return {"message": f"Expense category '{key}' deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
