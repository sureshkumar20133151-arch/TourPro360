import os
import glob
import subprocess
from PIL import Image

ARTIFACT_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\3b0260c3-3440-4ce7-bc0a-440089b2a527"
DEST_DIR = r"D:\anti gravity\Demo\360 feature\generated_360_images"

MAPPING = {
    "10_bedroom_2": "10_Bedroom_2.jpg",
    "11_master_bedroom": "11_Master_Bedroom.jpg",
    "12_master_bathroom": "12_Master_Bathroom.jpg",
    "13_front_terrace_balcony": "13_Front_Terrace_Balcony.jpg"
}

def main():
    print("Finding and converting newly generated PNG panoramas to JPEG...")
    for prefix, target_name in MAPPING.items():
        # Search for files with prefix in the artifact directory
        search_pattern = os.path.join(ARTIFACT_DIR, f"{prefix}_*.png")
        found_files = glob.glob(search_pattern)
        
        if found_files:
            # Sort to get the latest one if multiple exist
            latest_file = sorted(found_files)[-1]
            dest_file_path = os.path.join(DEST_DIR, target_name)
            
            print(f"--> Converting {os.path.basename(latest_file)} to {target_name}...")
            try:
                # Open PNG and convert to RGB (since JPEG doesn't support RGBA alpha channel)
                img = Image.open(latest_file)
                img_rgb = img.convert("RGB")
                img_rgb.save(dest_file_path, "JPEG", quality=90)
                print(f"    Saved successfully to: {dest_file_path}")
            except Exception as e:
                print(f"    Error converting {prefix}: {e}")
        else:
            print(f"--> [Warning] No generated image found for prefix: {prefix}")
            
    # Run the populate rooms database script to add the new images
    print("\nRunning populate_rooms.py to update database and copy assets...")
    try:
        subprocess.run(["python", "populate_rooms.py"], check=True)
        print("--> populate_rooms.py completed successfully!")
    except Exception as e:
        print(f"--> Error running populate_rooms.py: {e}")

if __name__ == "__main__":
    main()
