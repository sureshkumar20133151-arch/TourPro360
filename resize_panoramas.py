import os
from PIL import Image

IMAGE_DIR = r"D:\anti gravity\Demo\360 feature\generated_360_images"
TARGET_SIZE = (4096, 2048)

def main():
    if not os.path.exists(IMAGE_DIR):
        print(f"Error: Directory {IMAGE_DIR} does not exist.")
        return

    print("Starting downscaling of 360 images to 4096x2048 (4K) for WebGL compatibility...")
    files = [f for f in os.listdir(IMAGE_DIR) if f.endswith(".jpg")]
    
    for i, file_name in enumerate(files):
        file_path = os.path.join(IMAGE_DIR, file_name)
        try:
            with Image.open(file_path) as img:
                # Only resize if it's larger than target size
                if img.size[0] > TARGET_SIZE[0] or img.size[1] > TARGET_SIZE[1]:
                    print(f"[{i+1}/{len(files)}] Resizing {file_name} from {img.size} to {TARGET_SIZE}...")
                    # Using Resampling.LANCZOS for high quality downscaling
                    resized_img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
                    resized_img.save(file_path, "JPEG", quality=92, optimize=True)
                    print(f"--> Saved {file_name} successfully.")
                else:
                    print(f"[{i+1}/{len(files)}] {file_name} is already {img.size}. Skipping.")
        except Exception as e:
            print(f"--> Error resizing {file_name}: {e}")

    print("\nDownscaling complete! Now run populate_rooms.py to copy the resized images to public folders.")

if __name__ == "__main__":
    main()
