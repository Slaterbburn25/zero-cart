from backend.models import SessionLocal, User
from backend.logic.constraint_solver import optimize_basket

db = SessionLocal()
user = db.query(User).filter(User.id == 1).first()

print(f"User config:")
print(f"Budget: {user.weekly_budget}, Cal: {user.calorie_limit}, Family: {user.family_size}, Meals: {user.meals_per_day}")

res = optimize_basket(db, user, store_name="Tesco Live")
print(res)
db.close()
