import time, json
from logic.bigquery_client import ZeroCartBQ
from logic.llm_ideation import ideate_weekly_plan
from logic.llm_scraper import get_live_deals
from sqlalchemy.orm import Session
from models import SessionLocal, User

class SupplyChainDirector:
    def __init__(self):
        self.bq = ZeroCartBQ()
        self.db: Session = SessionLocal()

    def listen_for_missions(self):
        print("[SCD] Watching the mission queue for Slater's commands...")
        while True:
            missions = self.bq.check_for_mail()
            if not missions:
                time.sleep(10)
                continue
            
            for m in missions:
                self.execute_task(m)

    def execute_task(self, mission):
        m_id = mission['mission_id']
        # Safely parse the BQ JSON payload (to avoid buffer locks, BQ stores this natively)
        payload = json.loads(mission['payload']) if isinstance(mission['payload'], str) else mission['payload']
        user = self.db.query(User).filter(User.id == payload.get('user_id', 1)).first()

        self.bq.update_mission_status(m_id, "IN_PROGRESS")

        store = user.preferences.get("store_preference", "Tesco Live") if user and user.preferences else "Tesco Live"

        try:
            if mission['task_type'] == "IDEATE":
                print(f"[CHEF] Designing menu for {user.email}...")
                result = ideate_weekly_plan(user)
                
                if result.get("status") == "success":
                    from models import ProposedBasket
                    # Wipe previous basket for user
                    self.db.query(ProposedBasket).filter(ProposedBasket.user_id == user.id).delete()
                    
                    # Update the local SQLite proposed_basket table
                    new_basket = ProposedBasket(
                        user_id=user.id,
                        plan_json=json.dumps(result.get("plan", {}))
                    )
                    self.db.add(new_basket)
                    self.db.commit()
                    print(f"[SYNC] SQLite session.commit() successful: Mission {m_id} data injected to local proposed_basket.")
                    
                    # Once (and only once) SQLite commit is successful, mark as SUCCESS in BigQuery
                    self.bq.update_mission_status(m_id, "SUCCESS", result)
                else:
                    raise Exception(f"IDEATE step failed natively: {result.get('message', 'Unknown error')}")

            elif mission['task_type'] == "SCRAPE":
                print(f"[HUNTER] Scraper Drone: Hunting prices in {store} for User {user.id}...")
                # The payload contains target_categories (ingredients) from the previous pipeline
                result = get_live_deals(
                    target_categories=payload.get('targets', []),
                    store_name=store
                )
                
                if result.get("status") == "success":
                    from models import LocalDeal
                    # Wipe stale ingredients/prices specifically for this user to maintain isolation
                    self.db.query(LocalDeal).filter(LocalDeal.user_id == user.id).delete()
                    
                    deals = result.get("deals", [])
                    # Parse the execution result and update the local SQLite isolated ingredients table
                    for deal_data in deals:
                        try:
                            # Handle dict vs object return formats safely
                            raw_price = deal_data.get("price") if isinstance(deal_data, dict) else getattr(deal_data, 'price', None)
                            final_price = float(raw_price) if raw_price else 1.50
                            if final_price <= 0.01:
                                final_price = 1.25

                            new_deal = LocalDeal(
                                user_id=user.id,
                                store_name=store,
                                sku=deal_data.get("sku") if isinstance(deal_data, dict) else getattr(deal_data, "sku", ""),
                                item_name=deal_data.get("item_name") if isinstance(deal_data, dict) else getattr(deal_data, "item_name", ""),
                                price=final_price,
                                price_per_unit=deal_data.get("price_per_unit") if isinstance(deal_data, dict) else getattr(deal_data, "price_per_unit", 1.0),
                                item_url=deal_data.get("url", "") if isinstance(deal_data, dict) else getattr(deal_data, "url", ""),
                                protein_grams=deal_data.get("protein_grams") if isinstance(deal_data, dict) else getattr(deal_data, "protein_grams", 0.0),
                                calories=deal_data.get("calories") if isinstance(deal_data, dict) else getattr(deal_data, "calories", 0)
                            )
                            self.db.add(new_deal)
                        except Exception as parse_e:
                            print(f"Failed to map a scraped deal ingredient: {parse_e}")
                    
                    self.db.commit()
                    print(f"[SYNC] SQLite session.commit() successful: Mission {m_id} ingredients injected securely for user {user.id}.")
                    
                    # Once (and only once) SQLite commit is successful, mark as SUCCESS in BigQuery
                    self.bq.update_mission_status(m_id, "SUCCESS", result)
                    
                    # Distribute a chained execution directly into the Grid
                    print(f"[CHAIN] SCRAPE successful! Issuing nested BUILD task for Cart Architecture...")
                    self.bq.shout_order("BUILD", payload)
                else:
                    raise Exception(f"SCRAPE step failed natively: {result.get('message', 'Unknown error')}")
                
            elif mission['task_type'] == "BUILD":
                print(f"[MATH] Architect Drone: Mathematically calculating basket for {user.email}...")
                from logic.llm_basket_architect import allocate_basket
                from models import LocalDeal, FinalBasket
                
                # Rip all scraped deals natively for Gemini to calculate, strictly isolated by user_id
                fresh_deals = self.db.query(LocalDeal).filter(LocalDeal.user_id == user.id, LocalDeal.store_name == store).all()
                architect_result = allocate_basket(user=user, scraped_deals=fresh_deals)
                
                if architect_result.get("status") == "success":
                    # Wipe previous final basket gracefully
                    self.db.query(FinalBasket).filter(FinalBasket.user_id == user.id).delete()
                    
                    cart_payload = {
                        "basket_summary": architect_result.get("basket_summary"),
                        "basket_items": architect_result.get("basket_items")
                    }
                    
                    new_final = FinalBasket(
                        user_id=user.id,
                        cart_json=json.dumps(cart_payload)
                    )
                    self.db.add(new_final)
                    self.db.commit()
                    print(f"[SYNC] SQLite session.commit() successful: Mission {m_id} final cart populated.")
                    
                    # Once (and only once) SQLite commit is successful, mark as SUCCESS in BigQuery
                    self.bq.update_mission_status(m_id, "SUCCESS", architect_result)
                else:
                    raise Exception(f"BUILD step failed natively: {architect_result.get('message', 'Unknown error')}")
        
        except Exception as e:
            print(f"[ERROR] Task Failure: {str(e)}")
            self.bq.update_mission_status(m_id, "FAILED", {"error": str(e)})

if __name__ == "__main__":
    scd = SupplyChainDirector()
    scd.listen_for_missions()
