from sqlalchemy.orm import Session
from models import SessionLocal, LocalDeal, VirtualFridge, User
from datetime import date, timedelta

# Realistic mock data for a Tesco Exta in Blackburn
# Categories: Protein, Veg, Dairy, Carbs, Fruit
mock_deals = [
    {"store_name": "Tesco Blackburn", "sku": "1111", "item_name": "Tesco British Chicken Breast Fillets 650G", "price": 4.50, "price_per_unit": 0.69, "protein_grams": 149.5, "calories": 689},
    {"store_name": "Tesco Blackburn", "sku": "1112", "item_name": "Tesco Beef Lean Steak Mince 5% Fat 500G", "price": 3.49, "price_per_unit": 0.70, "protein_grams": 105.0, "calories": 620},
    {"store_name": "Tesco Blackburn", "sku": "1113", "item_name": "Tesco Everyday Value Baked Beans 420G", "price": 0.28, "price_per_unit": 0.07, "protein_grams": 19.3, "calories": 344},
    {"store_name": "Tesco Blackburn", "sku": "1114", "item_name": "Wholeforces Large Free Range Eggs 12 Pack", "price": 2.60, "price_per_unit": 0.21, "protein_grams": 90.0, "calories": 900},
    {"store_name": "Tesco Blackburn", "sku": "1115", "item_name": "Tesco Greek Style Natural Yogurt 500G", "price": 1.10, "price_per_unit": 0.22, "protein_grams": 25.0, "calories": 450},
    {"store_name": "Tesco Blackburn", "sku": "1116", "item_name": "Tesco Semi Skimmed Milk 4 Pints 2.27L", "price": 1.45, "price_per_unit": 0.06, "protein_grams": 81.7, "calories": 1135},
    {"store_name": "Tesco Blackburn", "sku": "1117", "item_name": "Tesco Closed Cup Mushrooms 300G", "price": 1.10, "price_per_unit": 0.37, "protein_grams": 5.4, "calories": 39},
    {"store_name": "Tesco Blackburn", "sku": "1118", "item_name": "Tesco Spinanch 260G", "price": 1.25, "price_per_unit": 0.48, "protein_grams": 7.3, "calories": 60},
    {"store_name": "Tesco Blackburn", "sku": "1119", "item_name": "Tesco Broccoli 350G", "price": 0.75, "price_per_unit": 0.21, "protein_grams": 15.4, "calories": 119},
    {"store_name": "Tesco Blackburn", "sku": "1120", "item_name": "Nightingale Farms Cherry Tomatoes 250G", "price": 0.65, "price_per_unit": 0.26, "protein_grams": 1.7, "calories": 45},
    {"store_name": "Tesco Blackburn", "sku": "1121", "item_name": "Tesco Red Onions 3 Pack", "price": 0.85, "price_per_unit": 0.28, "protein_grams": 2.0, "calories": 90},
    {"store_name": "Tesco Blackburn", "sku": "1122", "item_name": "Tesco Garlic Bulb", "price": 0.25, "price_per_unit": 0.25, "protein_grams": 1.0, "calories": 30},
    {"store_name": "Tesco Blackburn", "sku": "1123", "item_name": "Tesco White Potatoes 2.5Kg", "price": 1.65, "price_per_unit": 0.06, "protein_grams": 47.5, "calories": 1825},
    {"store_name": "Tesco Blackburn", "sku": "1124", "item_name": "Tesco Long Grain Rice 1Kg", "price": 1.25, "price_per_unit": 0.12, "protein_grams": 70.0, "calories": 3500},
    {"store_name": "Tesco Blackburn", "sku": "1125", "item_name": "Tesco Penne Pasta 500G", "price": 0.75, "price_per_unit": 0.15, "protein_grams": 60.0, "calories": 1785},
    {"store_name": "Tesco Blackburn", "sku": "1126", "item_name": "Suntrail Farms Lemons 4 Pack", "price": 0.65, "price_per_unit": 0.16, "protein_grams": 1.0, "calories": 40},
    {"store_name": "Tesco Blackburn", "sku": "1127", "item_name": "Tesco Fairtrade Bananas 5 Pack", "price": 0.85, "price_per_unit": 0.17, "protein_grams": 5.0, "calories": 445},
    {"store_name": "Tesco Blackburn", "sku": "1128", "item_name": "Tesco Gala Apples 6 Pack", "price": 1.70, "price_per_unit": 0.28, "protein_grams": 2.0, "calories": 350},
    {"store_name": "Tesco Blackburn", "sku": "1129", "item_name": "Tesco Carrots 1Kg", "price": 0.50, "price_per_unit": 0.05, "protein_grams": 6.0, "calories": 250},
    {"store_name": "Tesco Blackburn", "sku": "1130", "item_name": "Tesco Fine Green Beans 200G", "price": 0.95, "price_per_unit": 0.48, "protein_grams": 3.4, "calories": 50},
    {"store_name": "Tesco Blackburn", "sku": "1131", "item_name": "Tesco Smoked Back Bacon 300G", "price": 2.00, "price_per_unit": 0.66, "protein_grams": 45.0, "calories": 600},
    {"store_name": "Tesco Blackburn", "sku": "1132", "item_name": "Tesco Mature Cheddar 400G", "price": 3.00, "price_per_unit": 0.75, "protein_grams": 100.0, "calories": 1664},
    {"store_name": "Tesco Blackburn", "sku": "1133", "item_name": "Tesco Olive Oil 500Ml", "price": 4.50, "price_per_unit": 0.90, "protein_grams": 0.0, "calories": 4120},
    {"store_name": "Tesco Blackburn", "sku": "1134", "item_name": "Tesco Tomato & Basil Pasta Sauce 500G", "price": 0.90, "price_per_unit": 0.18, "protein_grams": 5.0, "calories": 200},
    {"store_name": "Tesco Blackburn", "sku": "1135", "item_name": "Tesco Rolled Oats 1Kg", "price": 0.90, "price_per_unit": 0.09, "protein_grams": 110.0, "calories": 3700},
    {"store_name": "Tesco Blackburn", "sku": "1136", "item_name": "Tesco Frozen Garden Peas 1Kg", "price": 1.40, "price_per_unit": 0.14, "protein_grams": 50.0, "calories": 700},
    {"store_name": "Tesco Blackburn", "sku": "1137", "item_name": "Tesco Wholemeal Bread 800G", "price": 0.75, "price_per_unit": 0.09, "protein_grams": 35.0, "calories": 1800},
    {"store_name": "Tesco Blackburn", "sku": "1138", "item_name": "Tesco British Pork Sausages 8 Pack 454G", "price": 1.80, "price_per_unit": 0.39, "protein_grams": 48.0, "calories": 1050},
    {"store_name": "Tesco Blackburn", "sku": "1139", "item_name": "Tesco Smooth Peanut Butter 340G", "price": 1.15, "price_per_unit": 0.34, "protein_grams": 85.0, "calories": 2100},
    {"store_name": "Tesco Blackburn", "sku": "1140", "item_name": "Tesco Tuna Steaks In Spring Water 4X145G", "price": 3.80, "price_per_unit": 0.95, "protein_grams": 116.0, "calories": 500},
]

def seed_database():
    db: Session = SessionLocal()

    print("Clearing existing data...")
    db.query(LocalDeal).delete()
    db.query(VirtualFridge).delete()
    db.query(User).delete()

    print("Creating mock User...")
    test_user = User(
        email="dave.blackburn@example.com",
        weekly_budget=90.0,
        calorie_limit=2200,
        family_size=1,
        meals_per_day=3,
        preferred_store="Tesco Live",
        dietary_constraints="none"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    print("Injecting Tesco and ASDA items into LocalDeals...")
    asda_deals = [
        {"store_name": "ASDA Blackburn", "sku": "A111", "item_name": "ASDA Tender Chicken Breasts 600G", "price": 4.20, "price_per_unit": 0.70, "protein_grams": 138.0, "calories": 640},
        {"store_name": "ASDA Blackburn", "sku": "A112", "item_name": "ASDA Lean Beef Mince 5% Fat 500G", "price": 3.40, "price_per_unit": 0.68, "protein_grams": 105.0, "calories": 620},
        {"store_name": "ASDA Blackburn", "sku": "A113", "item_name": "ASDA Baked Beans in Tomato Sauce 410G", "price": 0.27, "price_per_unit": 0.06, "protein_grams": 18.5, "calories": 330},
        {"store_name": "ASDA Blackburn", "sku": "A114", "item_name": "ASDA Large Free Range Eggs 12pk", "price": 2.50, "price_per_unit": 0.20, "protein_grams": 90.0, "calories": 900},
        {"store_name": "ASDA Blackburn", "sku": "A115", "item_name": "ASDA Greek Style Yogurt 500G", "price": 1.05, "price_per_unit": 0.21, "protein_grams": 24.0, "calories": 440},
        {"store_name": "ASDA Blackburn", "sku": "A116", "item_name": "ASDA Semi Skimmed Milk 4 Pints", "price": 1.45, "price_per_unit": 0.06, "protein_grams": 81.7, "calories": 1135},
        {"store_name": "ASDA Blackburn", "sku": "A117", "item_name": "ASDA Closed Cup Mushrooms 300G", "price": 1.00, "price_per_unit": 0.33, "protein_grams": 5.4, "calories": 39},
        {"store_name": "ASDA Blackburn", "sku": "A118", "item_name": "ASDA Baby Spinach 260G", "price": 1.20, "price_per_unit": 0.46, "protein_grams": 7.3, "calories": 60},
        {"store_name": "ASDA Blackburn", "sku": "A119", "item_name": "ASDA Broccoli 350G", "price": 0.75, "price_per_unit": 0.21, "protein_grams": 15.4, "calories": 119},
        {"store_name": "ASDA Blackburn", "sku": "A120", "item_name": "ASDA Cherry Tomatoes 250G", "price": 0.60, "price_per_unit": 0.24, "protein_grams": 1.7, "calories": 45},
        {"store_name": "ASDA Blackburn", "sku": "A121", "item_name": "ASDA Carrots 1Kg", "price": 0.45, "price_per_unit": 0.04, "protein_grams": 6.0, "calories": 250},
        {"store_name": "ASDA Blackburn", "sku": "A122", "item_name": "ASDA White Potatoes 2.5Kg", "price": 1.60, "price_per_unit": 0.06, "protein_grams": 47.5, "calories": 1825},
        {"store_name": "ASDA Blackburn", "sku": "A123", "item_name": "ASDA Long Grain Rice 1Kg", "price": 1.20, "price_per_unit": 0.12, "protein_grams": 70.0, "calories": 3500},
        {"store_name": "ASDA Blackburn", "sku": "A124", "item_name": "ASDA Penne Pasta 500G", "price": 0.70, "price_per_unit": 0.14, "protein_grams": 60.0, "calories": 1785},
    ]
    
    all_deals = mock_deals + asda_deals

    for deal_data in all_deals:
        deal = LocalDeal(**deal_data)
        db.add(deal)

    print("Adding some items currently sitting in Dave's Virtual Fridge...")
    fridge_items = [
        VirtualFridge(user_id=test_user.id, item_name="Tesco British Chicken Breast Fillets 650G", category="protein", quantity=300, unit="g", expiration_date=date.today() + timedelta(days=2)),
        VirtualFridge(user_id=test_user.id, item_name="Tesco Red Onions 3 Pack", category="veg", quantity=2, unit="items", expiration_date=date.today() + timedelta(days=7)),
        VirtualFridge(user_id=test_user.id, item_name="Tesco Everyday Value Baked Beans 420G", category="carbs", quantity=1, unit="tins", expiration_date=date.today() + timedelta(days=120)),
    ]
    for item in fridge_items:
        db.add(item)

    db.commit()
    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
