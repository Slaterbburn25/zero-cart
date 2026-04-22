import os
from models import Base, engine
from seed_db import seed_database

print("Dropping old tables...")
Base.metadata.drop_all(bind=engine)
print("Creating new tables with updated schema...")
Base.metadata.create_all(bind=engine)

print("Re-seeding Mock Database...")
seed_database()
print("Done!")
