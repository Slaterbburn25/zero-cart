from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, ForeignKey, JSON, DateTime
from datetime import datetime
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

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    postcode = Column(String, index=True, default="")
    preferences = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)

class VirtualFridge(Base):
    __tablename__ = "virtual_fridge"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    item_name = Column(String, index=True)
    category = Column(String)  # e.g., "protein", "veg", "dairy"
    quantity = Column(Float)
    unit = Column(String)  # e.g., "g", "ml", "items"
    expiration_date = Column(Date)
    
class LocalDeal(Base):
    __tablename__ = "local_deals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    store_name = Column(String, index=True)  # e.g., "Tesco Blackburn"
    sku = Column(String, index=True)
    item_name = Column(String)
    price = Column(Float)
    price_per_unit = Column(Float)  # e.g., cost per 100g
    item_url = Column(String, default="")
    protein_grams = Column(Float, default=0.0)  # Needed by Google OR-Tools
    calories = Column(Integer, default=0)

class ProposedBasket(Base):
    __tablename__ = "proposed_basket"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    plan_json = Column(String)  # Complete JSON dump of BQ IDEATE payload

class FinalBasket(Base):
    __tablename__ = "final_basket"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    cart_json = Column(String)  # JSON holding basket_summary and basket_items

class PipelineLog(Base):
    __tablename__ = "pipeline_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    phase = Column(String, index=True)  # e.g., 'IDEATE' or 'SCRAPE'
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# This physically creates the 'zerocart.db' file and the schema tables
Base.metadata.create_all(bind=engine)
