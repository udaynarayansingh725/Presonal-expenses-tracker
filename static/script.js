import json
import math
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "expenses.json")

app = FastAPI(title="Personal Expenses Tracker")

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


class Expense(BaseModel):
    category: str
    amount: float


def normalize_category(category: str) -> str:
    return category.strip().lower()


def load_expenses():
    if not os.path.exists(DATA_FILE):
        return {}

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return {}

    if not isinstance(data, dict):
        return {}

    normalized = {}
    for raw_category, raw_amount in data.items():
        category = normalize_category(str(raw_category))
        if not category:
            continue

        try:
            amount = float(raw_amount)
        except (TypeError, ValueError):
            continue

        if math.isfinite(amount):
            normalized[category] = amount

    return normalized


def save_expenses(expenses):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(expenses, f, indent=4, sort_keys=True)


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/expenses")
def get_all_expenses():
    return load_expenses()


@app.post("/api/expenses")
def add_expense(expense: Expense):
    category = normalize_category(expense.category)
    if not category:
        raise HTTPException(status_code=400, detail="Category cannot be empty")

    if not isinstance(expense.amount, (int, float)) or not math.isfinite(float(expense.amount)) or expense.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    expenses = load_expenses()
    expenses[category] = expenses.get(category, 0.0) + float(expense.amount)
    save_expenses(expenses)
    return {"message": "Expense added successfully", "category": category, "amount": expenses[category]}


@app.get("/api/expenses/{category}")
def search_expense(category: str):
    expenses = load_expenses()
    key = normalize_category(category)
    if key in expenses:
        return {"category": key, "amount": expenses[key]}
    raise HTTPException(status_code=404, detail="Expense category not found")


@app.get("/api/report")
def monthly_report():
    expenses = load_expenses()
    if not expenses:
        return {"expenses": {}, "total": 0.0, "count": 0}
    total = sum(float(amount) for amount in expenses.values())
    return {"expenses": expenses, "total": total, "count": len(expenses)}


@app.delete("/api/expenses/{category}")
def delete_expense(category: str):
    expenses = load_expenses()
    key = normalize_category(category)
    if key not in expenses:
        raise HTTPException(status_code=404, detail="Category not found")
    del expenses[key]
    save_expenses(expenses)
    return {"message": f"Expense category '{key}' deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
