from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker

# We'll use SQLite for development as agreed
SQLALCHEMY_DATABASE_URL = "sqlite:///./zerocart.db"

# connect_args={"check_same_thread": False} is required for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    weekly_budget = Column(Float, nullable=True) # None implies 'I dont care'
    calorie_limit = Column(Integer, nullable=True) # None implies 'I dont care'
    family_size = Column(Integer, default=1)
    meal_types_wanted = Column(String, default="Dinner")
    preferred_store = Column(String, default="Tesco Live")
    dietary_constraints = Column(String, default="none")  # e.g., "vegan, high-protein"
    primary_goal = Column(String, default="Balanced") # e.g. "Weight Loss", "Muscle Gain"
    preferred_meats = Column(String, default="Any") # e.g. "Chicken, Fish", "None"
    hated_foods = Column(String, default="none") # e.g. "Olives, Mushrooms"
    is_active = Column(Boolean, default=True)

class VirtualFridge(Base):
    __tablename__ = "virtual_fridge"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_name = Column(String, index=True)
    category = Column(String)  # e.g., "protein", "veg", "dairy"
    quantity = Column(Float)
    unit = Column(String)  # e.g., "g", "ml", "items"
    expiration_date = Column(Date)
    
class LocalDeal(Base):
    __tablename__ = "local_deals"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, index=True)  # e.g., "Tesco Blackburn"
    sku = Column(String, index=True)
    item_name = Column(String)
    price = Column(Float)
    price_per_unit = Column(Float)  # e.g., cost per 100g
    item_url = Column(String, default="")
    protein_grams = Column(Float, default=0.0)  # Needed by Google OR-Tools
    calories = Column(Integer, default=0)

# This physically creates the 'zerocart.db' file and the schema tables
Base.metadata.create_all(bind=engine)
