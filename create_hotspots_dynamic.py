import psycopg2

CONN_STR = "postgresql://postgres:wLervF2KiiapfbaP@db.ebjjrkefogdytnyaapbc.supabase.co:5432/postgres"
PROJECT_ID = "309f7ab7-5e71-4be3-86c5-ee5fe22f724e"

def main():
    print("Connecting to Supabase PostgreSQL database to configure hotspots dynamically...")
    conn = psycopg2.connect(CONN_STR)
    cursor = conn.cursor()
    
    try:
        # 1. Fetch room names and IDs
        cursor.execute("SELECT id, room_name FROM rooms WHERE project_id = %s", (PROJECT_ID,))
        rooms = {row[1]: row[0] for row in cursor.fetchall()}
        
        print("\nFound rooms in database:")
        for name, r_id in rooms.items():
            print(f" - '{name}': {r_id}")
            
        # 2. Identify target rooms
        balcony_id = rooms.get("First Floor - Open Terrace Balcony")
        observatory_id = rooms.get("Third Floor - Observatory Deck")
        portico_id = rooms.get("Ground Floor - Car Portico")
        facade_id = rooms.get("Exterior - Building Facade")
        
        if not balcony_id:
            print("Warning: 'First Floor - Open Terrace Balcony' room not found!")
        if not observatory_id:
            print("Warning: 'Third Floor - Observatory Deck' room not found!")
        if not portico_id:
            print("Warning: 'Ground Floor - Car Portico' room not found!")
        if not facade_id:
            print("Warning: 'Exterior - Building Facade' room not found!")
            
        hotspots_to_create = []
        
        # Add Balcony <-> Observatory link if both exist
        if balcony_id and observatory_id:
            hotspots_to_create.append({
                "from": balcony_id, "to": observatory_id,
                "pitch": 25.0, "yaw": 180.0,
                "label": "Go to Third Floor - Observatory Deck"
            })
            hotspots_to_create.append({
                "from": observatory_id, "to": balcony_id,
                "pitch": -25.0, "yaw": 0.0,
                "label": "Go down to First Floor - Open Balcony"
            })
            
        # Add Portico <-> Facade link if both exist
        if portico_id and facade_id:
            hotspots_to_create.append({
                "from": portico_id, "to": facade_id,
                "pitch": 0.0, "yaw": 180.0,
                "label": "View Building Exterior"
            })
            hotspots_to_create.append({
                "from": facade_id, "to": portico_id,
                "pitch": 0.0, "yaw": 0.0,
                "label": "Go to Car Portico"
            })
            
        # 3. Clear existing hotspots for the project rooms to avoid duplicates
        project_room_ids = list(rooms.values())
        if project_room_ids:
            cursor.execute(
                "DELETE FROM hotspots WHERE from_room_id = ANY(%s::uuid[]) OR to_room_id = ANY(%s::uuid[])",
                (project_room_ids, project_room_ids)
            )
            print(f"\n--> Cleared all existing hotspots for project rooms.")
            
        # 4. Insert new hotspots
        for hs in hotspots_to_create:
            cursor.execute(
                "INSERT INTO hotspots (from_room_id, to_room_id, pitch, yaw, label) VALUES (%s, %s, %s, %s, %s)",
                (hs["from"], hs["to"], hs["pitch"], hs["yaw"], hs["label"])
            )
            from_name = [name for name, rid in rooms.items() if rid == hs["from"]][0]
            to_name = [name for name, rid in rooms.items() if rid == hs["to"]][0]
            print(f"--> Created hotspot from '{from_name}' to '{to_name}' label: '{hs['label']}'")
            
        conn.commit()
        print("\nAll hotspots dynamically seeded successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\nError seeding hotspots: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
