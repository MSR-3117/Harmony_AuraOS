import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.worker import Worker
from app.models.machine import Machine, MachineType
import uuid
from datetime import datetime

def init_db():
    print("Initializing Database...")
    db = SessionLocal()
    try:
        # Create Tables (Ensure exist)
        print("Ensuring tables exist...")
        Base.metadata.create_all(bind=engine)
        
        # Check Workers
        count = db.query(Worker).count()
        print(f"Existing workers: {count}")
        if count < 6:
            print("Creating 6 mock workers...")
            workers = [
                Worker(worker_id=f"WK-{7820+i}", name=f"Worker {chr(65+i)}", department="Site Operations")
                for i in range(6)
            ]
            db.add_all(workers)
            db.commit()
            print("Workers created.")
        else:
            print("Workers already exist. Skipping.")

        # Check Machines
        m_count = db.query(Machine).count()
        print(f"Existing machines: {m_count}")
        if m_count < 4:
            print("Creating 4 mock machines...")
            machines = [
                Machine(machine_id="M-CRANE-01", name="Tower Crane X1", type=MachineType.CRANE),
                Machine(machine_id="M-EXC-02", name="Excavator E200", type=MachineType.EXCAVATOR),
                Machine(machine_id="M-LOAD-03", name="Loader L50", type=MachineType.LOADER),
                Machine(machine_id="M-DRILL-04", name="Drill Rig D4", type=MachineType.DRILL),
            ]
            db.add_all(machines)
            db.commit()
            print("Machines created.")
        else:
             print("Machines already exist. Skipping.")
             
        print("Database initialization complete!")

    except Exception as e:
        print(f"Error during initialization: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
