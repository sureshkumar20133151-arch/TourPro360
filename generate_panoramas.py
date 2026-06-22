import os
import shutil
import time
from gradio_client import Client

# Configuration
DEST_DIR = r"D:\anti gravity\Demo\360 feature\generated_360_images"
SPACE_NAME = "gokaygokay/360PanoImage"

# List of 13 rooms with optimized modern minimalist prompts matching Villa Myra theme
ROOMS = [
    {
        "name": "01_Ground_Floor_Car_Portico",
        "prompt": "360 degree equirectangular panorama of the covered car portico of a modern G+1 South Indian villa, seamless. A black SUV is parked in the portico under a wooden paneled ceiling with warm recessed lights. Looking from the portico towards the entrance door and showing the villa's modern front facade matching the elevation: clean white exterior wall, grey marble accent wall, and vertical wood slats. Natural morning sunlight, photorealistic architectural photography, 8k."
    },
    {
        "name": "02_Ground_Floor_Entrance_Lobby",
        "prompt": "360 degree equirectangular panorama of the entrance lobby of a luxury G+1 South Indian contemporary villa, seamless. Looking inside from the open solid teak wood main door. The lobby features a traditional brass urli pot with water and marigold flowers. Polished Italian marble flooring. White walls. Looking towards the dining hall and floating teak wood staircase. Warm recessed LED spotlights, photorealistic, 8k."
    },
    {
        "name": "03_Ground_Floor_Dining_Hall",
        "prompt": "360 degree equirectangular panorama of a spacious South Indian contemporary villa dining hall, seamless. Polished teak wood 8-seater dining table with chairs. Polished ivory cream Italian marble flooring. To the side is the floating teak wood staircase. Open layout connects to the modular kitchen. Recessed LED spotlights, photorealistic, 8k."
    },
    {
        "name": "04_Ground_Floor_Modular_Kitchen",
        "prompt": "360 degree equirectangular panorama of a premium South Indian modular kitchen, seamless. Dark grey acrylic cabinets and white marble countertops. L-shaped layout. Polished ivory cream marble flooring. Looking towards the dining hall breakfast counter. Modern lighting, photorealistic, 8k."
    },
    {
        "name": "05_Ground_Floor_Main_Hall",
        "prompt": "360 degree equirectangular panorama of a double-height Main Hall in a South Indian contemporary villa, seamless. Spectacular double-height ceiling with floor-to-ceiling glass windows matching the front elevation. A large TV mounted on a white marble feature wall with vertical teak wood slats. L-shaped sectional sofa on polished marble floor. Modern chandelier hanging from the double-height ceiling, warm cove lighting, photorealistic, 8k."
    },
    {
        "name": "06_Ground_Floor_Guest_Bedroom",
        "prompt": "360 degree equirectangular panorama of a modern South Indian guest bedroom, seamless. A single queen-size bed with a grey fabric headboard against a beige textured wall. Only one bed is present in the entire room, no duplicate beds. Polished teak wood flooring. Large window with sheer curtains, cozy premium interior, 8k."
    },
    {
        "name": "07_Ground_Floor_Common_Bathroom",
        "prompt": "360 degree equirectangular panorama of a modern Indian common bathroom, seamless. Floating teak wood vanity with round backlit mirror. Walk-in shower with glass partition, wall-mounted commode, anti-skid dark grey floor tiles, beige marble wall tiles, warm lighting, 8k."
    },
    {
        "name": "08_First_Floor_Upstairs_Hall",
        "prompt": "360 degree equirectangular panorama of a first floor upstairs living hall in a South Indian contemporary villa, seamless. Comfort beige sofa, teak wood landing, glass sliding door leading to the front balcony. Polished teak wood flooring, warm LED downlights, photorealistic, 8k."
    },
    {
        "name": "09_First_Floor_Gym_Room",
        "prompt": "360 degree equirectangular panorama of a modern home gym room, seamless. Treadmill, dumbbell rack. Full-height mirror wall. Dark grey rubber floor tiles, bright ceiling LED panel lights, clean and spacious, 8k."
    },
    {
        "name": "10_First_Floor_Kids_Bedroom",
        "prompt": "360 degree equirectangular panorama of a modern kid's bedroom in a South Indian villa, seamless. A single bed with light wood finishes, study desk and study chair. Only one bed is present in the entire room, no duplicate beds. High-gloss vitrified tile floor. Matte grey laminates wardrobe, bright natural light, 8k."
    },
    {
        "name": "11_First_Floor_Master_Bedroom",
        "prompt": "360 degree equirectangular panorama of a modern Indian master bedroom, seamless. A single king-size bed with a grey fabric headboard against a wall of charcoal fluted panels with warm embedded LED profile light strips. Only one bed is present in the entire room, no duplicate beds. High-gloss vitrified floor tiles. Sliding glass doors open to a balcony. Warm recessed spotlights, photorealistic, 8k."
    },
    {
        "name": "12_First_Floor_Master_Bathroom",
        "prompt": "360 degree equirectangular panorama of a luxury master bathroom in a South Indian villa, seamless. Double vanity with backlit mirrors. Walk-in shower with black-framed glass partition. Matte dark grey anti-skid floor tiles, beige wall tiles, warm spotlights, 8k."
    },
    {
        "name": "13_First_Floor_Open_Terrace_Balcony",
        "prompt": "360 degree equirectangular panorama of the first floor open terrace balcony of a South Indian villa, seamless. Glass railing with black metal frame. Floor with artificial green grass turf. Outdoor rattan chairs, wood-plank ceiling with warm downlights, morning sunlight, 8k."
    }
]

def main():
    os.makedirs(DEST_DIR, exist_ok=True)
    print(f"Connecting to Hugging Face Space: {SPACE_NAME}...")
    token = os.environ.get("HF_TOKEN")
    token_file = "hf_token.txt"
    if not token and os.path.exists(token_file):
        try:
            with open(token_file, "r") as f:
                token = f.read().strip()
            print("Loaded Hugging Face token from hf_token.txt")
        except Exception as e:
            print(f"Failed to read hf_token.txt: {e}")

    try:
        if token:
            os.environ["HF_TOKEN"] = token
        client = Client(SPACE_NAME)
    except Exception as e:
        print(f"Failed to connect to space: {e}")
        return

    print(f"Destination folder for generated 360 images: {DEST_DIR}\n")

    for i, room in enumerate(ROOMS):
        name = room["name"]
        prompt = room["prompt"]
        dest_file_path = os.path.join(DEST_DIR, f"{name}.jpg")

        if os.path.exists(dest_file_path):
            print(f"[{i+1}/{len(ROOMS)}] {name}.jpg already exists. Skipping...")
            continue

        print(f"[{i+1}/{len(ROOMS)}] Generating 360 panorama for: {name}...")
        print(f"Prompt: {prompt}")

        start_time = time.time()
        try:
            # Call Gradio client API endpoint
            # We set upscale=True for high resolution (6144x3072)
            result = client.predict(
                prompt=prompt,
                upscale=True,
                api_name="/generate_with_update"
            )

            # Gradio return values: value_9 (Pannellum file info) and Generated Image file info
            # The second item (result[1]) contains the FileData for the high quality generated image
            img_info = result[1]
            temp_file_path = img_info.get("path") if isinstance(img_info, dict) else img_info

            if temp_file_path and os.path.exists(temp_file_path):
                shutil.copy(temp_file_path, dest_file_path)
                elapsed = time.time() - start_time
                print(f"--> Successfully saved to: {dest_file_path} (Took {elapsed:.1f}s)\n")
            else:
                print(f"--> Error: Temp file not found or invalid response format: {result}\n")

        except Exception as e:
            print(f"--> Error generating {name}: {e}\n")
            # Wait a few seconds before retrying next image to avoid rate limit locks
            time.sleep(5)

    print("All generations completed!")

if __name__ == "__main__":
    main()
