import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ortools.linear_solver import pywraplp
from sqlalchemy.orm import Session
from models import LocalDeal, VirtualFridge

def optimize_basket(db: Session, user_id: int, budget: float, min_protein: float = 300.0):
    """
    Executes Google OR-Tools to calculate the perfect grocery basket.
    """
    # Create the SCIP integer programming solver.
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        return {"status": "failed", "reason": "Solver backend not available."}

    # 1. Fetch available deals from our local supermarket (Tesco Blackburn mock data)
    all_deals = db.query(LocalDeal).all()
    if not all_deals:
        return {"status": "failed", "reason": "No store inventory found."}
    
    # 2. Fetch the user's current Virtual Fridge inventory
    fridge_items = db.query(VirtualFridge).filter(VirtualFridge.user_id == user_id).all()
    fridge_item_names = {item.item_name for item in fridge_items}

    # Prepare logic variables
    variables = {}
    
    # Create an integer variable for each distinct product we can buy
    for deal in all_deals:
        # Constraint C: If they already have it in the fridge, skip buying more! (Waste Prevention)
        max_qty = 0 if deal.item_name in fridge_item_names else 4 
        
        # Define solver variable: x quantities of this deal (from 0 to max_qty)
        variables[deal.id] = solver.IntVar(0, max_qty, f'deal_{deal.id}')

    # Constraint A: Total mathematical cost MUST be <= User Budget
    cost_expr = []
    for deal in all_deals:
        cost_expr.append(variables[deal.id] * deal.price)
    solver.Add(sum(cost_expr) <= budget)

    # Constraint B: Total protein MUST be >= Target Minimum
    protein_expr = []
    for deal in all_deals:
        protein_expr.append(variables[deal.id] * deal.protein_grams)
    solver.Add(sum(protein_expr) >= min_protein)

    # Objective Goal: To get the most "value" out of the budget, let's maximize the total calories 
    # while adhering strictly to constraints A, B and C.
    calorie_expr = []
    for deal in all_deals:
        calorie_expr.append(variables[deal.id] * deal.calories)
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
                "budget_utilized": f"{round((total_cost/budget)*100, 1)}%"
            }
        }
    else:
        return {"status": "failed", "reason": "No mathematically optimal solution exists for those strict constraints."}
