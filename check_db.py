import psycopg2

CONN_STR = "postgresql://postgres:wLervF2KiiapfbaP@db.ebjjrkefogdytnyaapbc.supabase.co:5432/postgres"
PROJECT_ID = "309f7ab7-5e71-4be3-86c5-ee5fe22f724e"

def main():
    conn = psycopg2.connect(CONN_STR)
    cursor = conn.cursor()
    
    # Check project
    cursor.execute("SELECT id, building_name, client_name, entry_room_id FROM projects WHERE id = %s", (PROJECT_ID,))
    project = cursor.fetchone()
    print("Project details:", project)
    
    # Check rooms
    cursor.execute("SELECT id, room_name, photo_url FROM rooms WHERE project_id = %s ORDER BY sort_order", (PROJECT_ID,))
    rooms = cursor.fetchall()
    print("\nExisting rooms in database:")
    for r in rooms:
        print(f"Room ID: {r[0]} | Name: '{r[1]}' | Photo URL: {r[2]}")
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
