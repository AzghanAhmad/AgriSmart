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

                if not column_exists(inspector, 'Users', 'profile_image_url'):
                    print("    ➕ Adding 'profile_image_url' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN profile_image_url VARCHAR(500)'))
                    conn.commit()
                    print("    ✅ Added 'profile_image_url' column to Users")

                if not column_exists(inspector, 'Users', 'token_version'):
                    print("    ➕ Adding 'token_version' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN token_version INTEGER DEFAULT 0'))
                    conn.commit()
                    print("    ✅ Added 'token_version' column to Users")

                if not column_exists(inspector, 'Users', 'privacy_share_location'):
                    print("    ➕ Adding 'privacy_share_location' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN privacy_share_location INTEGER DEFAULT 1'))
                    conn.commit()
                    print("    ✅ Added 'privacy_share_location' column to Users")

                if not column_exists(inspector, 'Users', 'privacy_share_crop'):
                    print("    ➕ Adding 'privacy_share_crop' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN privacy_share_crop INTEGER DEFAULT 0'))
                    conn.commit()
                    print("    ✅ Added 'privacy_share_crop' column to Users")

                if not column_exists(inspector, 'Users', 'privacy_analytics'):
                    print("    ➕ Adding 'privacy_analytics' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN privacy_analytics INTEGER DEFAULT 1'))
                    conn.commit()
                    print("    ✅ Added 'privacy_analytics' column to Users")

                if not column_exists(inspector, 'Users', 'farm_acres'):
                    print("    ➕ Adding 'farm_acres' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN farm_acres REAL'))
                    conn.commit()
                    print("    ✅ Added 'farm_acres' column to Users")

                if not column_exists(inspector, 'Users', 'farm_crop_types'):
                    print("    ➕ Adding 'farm_crop_types' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN farm_crop_types INTEGER'))
                    conn.commit()
                    print("    ✅ Added 'farm_crop_types' column to Users")

                if not column_exists(inspector, 'Users', 'farm_health_score'):
                    print("    ➕ Adding 'farm_health_score' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN farm_health_score REAL'))
                    conn.commit()
                    print("    ✅ Added 'farm_health_score' column to Users")

                if not column_exists(inspector, 'Users', 'farm_monthly_revenue'):
                    print("    ➕ Adding 'farm_monthly_revenue' column...")
                    conn.execute(text('ALTER TABLE "Users" ADD COLUMN farm_monthly_revenue REAL'))
                    conn.commit()
                    print("    ✅ Added 'farm_monthly_revenue' column to Users")
            
            # Check if OutbreakAlerts table exists
            if not table_exists(inspector, 'OutbreakAlerts'):
                print("  🔍 Creating OutbreakAlerts table...")
                conn.execute(text("""
                    CREATE TABLE "OutbreakAlerts" (
                        alert_id VARCHAR(50) PRIMARY KEY,
                        disease_id VARCHAR(50),
                        disease_name VARCHAR(120) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        center_lat REAL NOT NULL,
                        center_lng REAL NOT NULL,
                        radius_km REAL NOT NULL DEFAULT 10.0
                    )
                """))
                conn.commit()
                print("  ✅ Created 'OutbreakAlerts' table")
            else:
                # Add disease_name column if missing
                if not column_exists(inspector, 'OutbreakAlerts', 'disease_name'):
                    print("    ➕ Adding 'disease_name' column to OutbreakAlerts...")
                    conn.execute(text('ALTER TABLE "OutbreakAlerts" ADD COLUMN disease_name VARCHAR(120)'))
                    conn.commit()
                    print("    ✅ Added 'disease_name' column to OutbreakAlerts")

            # Chatbot conversation persistence (ChatGPT-style threads)
            if not table_exists(inspector, 'chat_conversations'):
                print("  🔍 Creating chat_conversations table...")
                conn.execute(text("""
                    CREATE TABLE chat_conversations (
                        id VARCHAR(36) PRIMARY KEY,
                        user_id VARCHAR(50) NOT NULL,
                        title VARCHAR(200),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES Users(user_id)
                    )
                """))
                conn.commit()
                print("  ✅ Created 'chat_conversations' table")
            if not table_exists(inspector, 'chat_messages'):
                print("  🔍 Creating chat_messages table...")
                conn.execute(text("""
                    CREATE TABLE chat_messages (
                        id VARCHAR(36) PRIMARY KEY,
                        conversation_id VARCHAR(36) NOT NULL,
                        role VARCHAR(20) NOT NULL,
                        content TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(conversation_id) REFERENCES chat_conversations(id)
                    )
                """))
                conn.commit()
                print("  ✅ Created 'chat_messages' table")
        
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

