"""
Database Migration Script
Adds missing columns to Detections and Users tables, and creates OutbreakAlerts table
"""
import sqlalchemy
from sqlalchemy import inspect, text

def column_exists(inspector, table_name, column_name):
    """Check if a column exists in a table"""
    try:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False

def table_exists(inspector, table_name):
    """Check if a table exists"""
    try:
        return inspector.has_table(table_name)
    except Exception:
        return False

def run_migrations(engine):
    """
    Add new columns to existing tables and create new tables if needed.
    This is safe to run multiple times (idempotent).
    """
    try:
        inspector = inspect(engine)
        
        with engine.connect() as conn:
            # Check if Detections table exists
            if table_exists(inspector, 'Detections'):
                print("  🔍 Checking Detections table...")
                
                if not column_exists(inspector, 'Detections', 'latitude'):
                    print("    ➕ Adding 'latitude' column...")
                    conn.execute(text('ALTER TABLE "Detections" ADD COLUMN latitude REAL'))
                    conn.commit()
                    print("    ✅ Added 'latitude' column")
                
                if not column_exists(inspector, 'Detections', 'longitude'):
                    print("    ➕ Adding 'longitude' column...")
                    conn.execute(text('ALTER TABLE "Detections" ADD COLUMN longitude REAL'))
                    conn.commit()
                    print("    ✅ Added 'longitude' column")
                
                if not column_exists(inspector, 'Detections', 'alert_generated'):
                    print("    ➕ Adding 'alert_generated' column...")
                    conn.execute(text('ALTER TABLE "Detections" ADD COLUMN alert_generated VARCHAR(10) DEFAULT \'no\''))
                    conn.commit()
                    print("    ✅ Added 'alert_generated' column")
                
                if not column_exists(inspector, 'Detections', 'crop_type'):
                    print("    ➕ Adding 'crop_type' column...")
                    conn.execute(text('ALTER TABLE "Detections" ADD COLUMN crop_type VARCHAR(50)'))
                    conn.commit()
                    print("    ✅ Added 'crop_type' column")

                if not column_exists(inspector, 'Detections', 'disease_name'):
                    print("    ➕ Adding 'disease_name' column...")
                    conn.execute(text('ALTER TABLE "Detections" ADD COLUMN disease_name VARCHAR(120)'))
                    conn.commit()
                    print("    ✅ Added 'disease_name' column")
            
            # Check if Users table exists
            if table_exists(inspector, 'Users'):
                print("  🔍 Checking Users table...")
                
                if not column_exists(inspector, 'Users', 'latitude'):
                    print("    ➕ Adding 'latitude' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN latitude REAL'))
                    conn.commit()
                    print("    ✅ Added 'latitude' column to Users")
                
                if not column_exists(inspector, 'Users', 'longitude'):
                    print("    ➕ Adding 'longitude' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN longitude REAL'))
                    conn.commit()
                    print("    ✅ Added 'longitude' column to Users")

                if not column_exists(inspector, 'Users', 'location'):
                    print("    ➕ Adding 'location' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN location VARCHAR(255)'))
                    conn.commit()
                    print("    ✅ Added 'location' column to Users")
            
            # Check if OutbreakAlerts table exists
            if not table_exists(inspector, 'OutbreakAlerts'):
                print("  🔍 Creating OutbreakAlerts table...")
                conn.execute(text("""
                    CREATE TABLE "OutbreakAlerts" (
                        alert_id VARCHAR(50) PRIMARY KEY,
                        disease_id VARCHAR(50) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        center_lat REAL NOT NULL,
                        center_lng REAL NOT NULL,
                        radius_km REAL NOT NULL DEFAULT 10.0
                    )
                """))
                conn.commit()
                print("  ✅ Created 'OutbreakAlerts' table")
        
        print("✅ Migration completed successfully")
        
    except Exception as e:
        print(f"⚠️ Migration error: {e}")
        # Don't raise, just warn - tables might already have the columns

if __name__ == '__main__':
    # For standalone execution
    try:
        from db import engine
    except ImportError:
        from Backend.db import engine
    
    run_migrations(engine)

