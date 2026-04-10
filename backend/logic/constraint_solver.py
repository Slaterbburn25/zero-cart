import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ortools.linear_solver import pywraplp
from sqlalchemy.orm import Session
from models import LocalDeal, VirtualFridge

def optimize_basket(db: Session, user, store_name: str = "Tesco Blackburn"):
    """
    Executes Google OR-Tools to calculate the perfect grocery basket.
    Dynamically adjusts constraints based on user profile preferences.
    """
    # Create the SCIP integer programming solver.
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        return {"status": "failed", "reason": "Solver backend not available."}

    # 1. Fetch available deals from our local supermarket
    all_deals = db.query(LocalDeal).filter(LocalDeal.store_name == store_name).all()
    if not all_deals:
        return {"status": "failed", "reason": f"No store inventory found for {store_name}."}
    
    # 2. Fetch the user's current Virtual Fridge inventory
    fridge_items = db.query(VirtualFridge).filter(VirtualFridge.user_id == user.id).all()
    fridge_item_names = {item.item_name for item in fridge_items}

    # Prepare logic variables
    variables = {}
    
    # Heuristically cap maximum distinct items purchased so the bot doesn't buy 5,000 chickens
    # if the user disables budget and calorie limits ("I don't care" option).
    # We parse the comma-separated meal array to dynamically bound the logic.
    number_of_meals_daily = len(user.meal_types_wanted.split(',')) if user.meal_types_wanted else 1
    safe_cap_quantity = user.family_size * number_of_meals_daily * 2

    for deal in all_deals:
        # Constraint C: If they already have it in the fridge, skip buying more! (Waste Prevention)
        max_qty = 0 if deal.item_name in fridge_item_names else safe_cap_quantity 
        
        # Define solver variable: x quantities of this deal (from 0 to max_qty)
        variables[deal.id] = solver.IntVar(0, max_qty, f'deal_{deal.id}')

    # Constraint A: Total mathematical cost MUST be <= User Budget
    cost_expr = []
    for deal in all_deals:
        cost_expr.append(variables[deal.id] * deal.price)
    
    # Only enforce strict math if user set a budget! Otherwise skip it natively!
    if user.weekly_budget is not None and user.weekly_budget > 0:
        solver.Add(sum(cost_expr) <= user.weekly_budget)

    # Constraint B: Total protein MUST align with family size
    protein_expr = []
    for deal in all_deals:
        protein_expr.append(variables[deal.id] * deal.protein_grams)
    
    # A generic healthy threshold per person per week
    solver.Add(sum(protein_expr) >= (user.family_size * 250.0))

    # Constraint C: Caloric Limits ("I don't care" handling)
    calorie_expr = []
    for deal in all_deals:
        calorie_expr.append(variables[deal.id] * deal.calories)

    if user.calorie_limit is not None and user.calorie_limit > 0:
        # Cap at weekly total
        solver.Add(sum(calorie_expr) <= (user.calorie_limit * 7 * user.family_size))
        # Since we're capping calories, maximize protein Instead
        solver.Maximize(sum(protein_expr))
    else:
        # User doesn't care. Let's just maximize the absolute caloric haul (value for money).
        solver.Maximize(sum(calorie_expr))

    # EXECUTE THE EDGE COMPUTE MATH
    status = solver.Solve()

    if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
        basket = []
        total_cost = 0.0
        total_protein = 0.0
        
        for deal in all_deals:
            qty = variables[deal.id].solution_value()
            if qty > 0:
                basket.append({
                    "sku": deal.sku,
                    "item_name": deal.item_name,
                    "url": deal.item_url,
                    "quantity": int(qty),
                    "selected_price": round(qty * deal.price, 2)
                })
                total_cost += qty * deal.price
                total_protein += qty * deal.protein_grams
        
        return {
            "status": "success",
            "basket": basket,
            "summary": {
                "total_cost": round(total_cost, 2),
                "total_protein_grams": round(total_protein, 2),
                "budget_utilized": f"{round((total_cost/user.weekly_budget)*100, 1)}%" if user.weekly_budget else "N/A"
            }
        }
    else:
        return {"status": "failed", "reason": "No mathematically optimal solution exists for those strict constraints."}
