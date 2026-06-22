import os
import shutil
import psycopg2

CONN_STR = "postgresql://postgres:wLervF2KiiapfbaP@db.ebjjrkefogdytnyaapbc.supabase.co:5432/postgres"
PROJECT_ID = "309f7ab7-5e71-4be3-86c5-ee5fe22f724e"

# Path configuration
SOURCE_DIR = r"D:\anti gravity\Demo\360 feature\generated_360_images"
TARGET_DIRS = [
    r"D:\anti gravity\Demo\360 feature\tourpro-admin\public\generated_360_images",
    r"D:\anti gravity\Demo\360 feature\tourpro-widget\public\generated_360_images",
    r"D:\anti gravity\Demo\360 feature\tourpro-mobile\public\generated_360_images"
]

ROOMS = [
    {"file": "01_Ground_Floor_Car_Portico.jpg", "name": "Ground Floor - Car Portico"},
    {"file": "02_Ground_Floor_Entrance_Lobby.jpg", "name": "Ground Floor - Entrance Lobby"},
    {"file": "03_Ground_Floor_Dining_Hall.jpg", "name": "Ground Floor - Dining Hall"},
    {"file": "04_Ground_Floor_Modular_Kitchen.jpg", "name": "Ground Floor - Modular Kitchen"},
    {"file": "05_Ground_Floor_Main_Hall.jpg", "name": "Ground Floor - Main Hall (Double Height)"},
    {"file": "06_Ground_Floor_Guest_Bedroom.jpg", "name": "Ground Floor - Guest Bedroom"},
    {"file": "07_Ground_Floor_Common_Bathroom.jpg", "name": "Ground Floor - Common Bathroom"},
    {"file": "08_First_Floor_Upstairs_Hall.jpg", "name": "First Floor - Upstairs Hall"},
    {"file": "09_First_Floor_Gym_Room.jpg", "name": "First Floor - Gym Room"},
    {"file": "10_First_Floor_Kids_Bedroom.jpg", "name": "First Floor - Kids Bedroom"},
    {"file": "11_First_Floor_Master_Bedroom.jpg", "name": "First Floor - Master Bedroom"},
    {"file": "12_First_Floor_Master_Bathroom.jpg", "name": "First Floor - Master Bathroom"},
    {"file": "13_First_Floor_Open_Terrace_Balcony.jpg", "name": "First Floor - Open Terrace Balcony"}
]

def copy_images():
    print("Copying generated 360 images to project public folders...")
    for target in TARGET_DIRS:
        os.makedirs(target, exist_ok=True)
        for room in ROOMS:
            src_file = os.path.join(SOURCE_DIR, room["file"])
            dest_file = os.path.join(target, room["file"])
            if os.path.exists(src_file):
                shutil.copy(src_file, dest_file)
                print(f"--> Copied {room['file']} to {target}")
            else:
                print(f"--> [Warning] Source file not found: {src_file}")

def update_database():
    print("\nConnecting to Supabase PostgreSQL database to populate rooms...")
    conn = psycopg2.connect(CONN_STR)
    cursor = conn.cursor()
    
    try:
        # 1. Clear existing entry room link in projects (to avoid foreign key constraint)
        cursor.execute("UPDATE projects SET entry_room_id = NULL WHERE id = %s", (PROJECT_ID,))
        
        # 2. Delete all existing rooms for this project
        cursor.execute("DELETE FROM rooms WHERE project_id = %s", (PROJECT_ID,))
        print("--> Cleared all existing rooms and hotspots from database.")
        
        inserted_rooms = []
        
        # 3. Insert the 9 generated rooms
        for i, room in enumerate(ROOMS):
            room_name = room["name"]
            photo_url = f"/generated_360_images/{room['file']}"
            sort_order = i
            
            cursor.execute(
                "INSERT INTO rooms (project_id, room_name, photo_url, sort_order) VALUES (%s, %s, %s, %s) RETURNING id",
                (PROJECT_ID, room_name, photo_url, sort_order)
            )
            room_id = cursor.fetchone()[0]
            inserted_rooms.append((room_name, room_id))
            print(f"--> Inserted room '{room_name}' with ID: {room_id}")
            
        # 4. Set the default entry room (Ground Floor - Entrance Lobby)
        entry_room_id = None
        for name, r_id in inserted_rooms:
            if name == "Ground Floor - Entrance Lobby":
                entry_room_id = r_id
                break
        
        if not entry_room_id and inserted_rooms:
            entry_room_id = inserted_rooms[0][1] # fallback to first room
            
        if entry_room_id:
            cursor.execute(
                "UPDATE projects SET entry_room_id = %s WHERE id = %s",
                (entry_room_id, PROJECT_ID)
            )
            print(f"--> Set '{[n for n, rid in inserted_rooms if rid == entry_room_id][0]}' as the default entry room.")
            
        conn.commit()
        print("\nDatabase transaction committed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n--> Error updating database: {e}")
        raise e
        
    finally:
        cursor.close()
        conn.close()

def main():
    copy_images()
    update_database()
    print("\nAll setup actions finished successfully! Start your local server or check Vercel to preview the new rooms.")

if __name__ == "__main__":
    main()
