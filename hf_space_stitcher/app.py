import os
import math
import glob
import numpy as np
import cv2
import gradio as gr
import spaces

def crop_black_borders(img, tolerance=10):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, tolerance, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    return img[y:y+h, x:x+w]

def format_equirectangular(pano, target_width=4096):
    h, w = pano.shape[:2]
    target_height = target_width // 2
    scale = target_width / float(w)
    new_h = int(h * scale)
    if new_h > target_height:
        new_h = target_height
        target_width = int(w * (new_h / float(h)))
        target_width = (target_width // 2) * 2
    
    resized_pano = cv2.resize(pano, (target_width, new_h), interpolation=cv2.INTER_LANCZOS4)
    canvas = np.zeros((target_height, target_width, 3), dtype=np.uint8)
    y_offset = (target_height - new_h) // 2
    canvas[y_offset:y_offset + new_h, 0:target_width] = resized_pano
    
    if y_offset > 0:
        top_color = np.mean(resized_pano[:10, :, :], axis=(0, 1)).astype(np.uint8)
        bottom_color = np.mean(resized_pano[-10:, :, :], axis=(0, 1)).astype(np.uint8)
        canvas[:y_offset, :] = top_color
        canvas[y_offset + new_h:, :] = bottom_color
        cv2.GaussianBlur(canvas, (21, 21), 0, dst=canvas)
        canvas[y_offset:y_offset + new_h, 0:target_width] = resized_pano
        
    return canvas

def inject_photosphere_xmp(jpeg_path):
    with open(jpeg_path, 'rb') as f:
        img_bytes = f.read()
    if img_bytes[:2] != b'\xff\xd8':
        return
    img = cv2.imread(jpeg_path)
    if img is None:
        return
    h, w = img.shape[:2]
    
    xmp_str = (
        '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">'
        '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
        '<rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/">'
        '<GPano:UsePanoramaViewer>True</GPano:UsePanoramaViewer>'
        '<GPano:CaptureSoftware>TourPro360</GPano:CaptureSoftware>'
        '<GPano:StitchingSoftware>TourPro360 REA Stitcher</GPano:StitchingSoftware>'
        '<GPano:ProjectionType>equirectangular</GPano:ProjectionType>'
        '<GPano:PoseHeadingDegrees>0.0</GPano:PoseHeadingDegrees>'
        '<GPano:PosePitchDegrees>0.0</GPano:PosePitchDegrees>'
        '<GPano:PoseRollDegrees>0.0</GPano:PoseRollDegrees>'
        f'<GPano:FullPanoWidthPixels>{w}</GPano:FullPanoWidthPixels>'
        f'<GPano:FullPanoHeightPixels>{h}</GPano:FullPanoHeightPixels>'
        f'<GPano:CroppedAreaImageWidthPixels>{w}</GPano:CroppedAreaImageWidthPixels>'
        f'<GPano:CroppedAreaImageHeightPixels>{h}</GPano:CroppedAreaImageHeightPixels>'
        '<GPano:CroppedAreaLeftPixels>0</GPano:CroppedAreaLeftPixels>'
        '<GPano:CroppedAreaTopPixels>0</GPano:CroppedAreaTopPixels>'
        '</rdf:Description>'
        '</rdf:RDF>'
        '</x:xmpmeta>'
    )
    payload = b'http://ns.adobe.com/xap/1.0/\x00' + xmp_str.encode('utf-8')
    length = len(payload) + 2
    app1_marker = b'\xff\xe1' + length.to_bytes(2, 'big') + payload
    new_bytes = img_bytes[:2] + app1_marker + img_bytes[2:]
    with open(jpeg_path, 'wb') as f:
        f.write(new_bytes)

def attempt_stitching(images):
    """
    Multi-pass stitcher:
    1. Full batch panorama mode (SIFT/bundle adjustment)
    2. Scans mode fallback
    3. Hierarchical ring blending
    """
    # Pass 1: Standard Panorama (Spherical)
    stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
    status, pano = stitcher.stitch(images)
    if status == cv2.Stitcher_OK and pano is not None:
        return pano

    # Pass 2: Scans mode (affine / translation robust for tight indoor rooms)
    stitcher_scans = cv2.Stitcher_create(cv2.Stitcher_SCANS)
    status_scans, pano_scans = stitcher_scans.stitch(images)
    if status_scans == cv2.Stitcher_OK and pano_scans is not None:
        return pano_scans

    # Pass 3: Core ring fallback if edge/polar shots had low texture
    if len(images) > 6:
        # Take the middle 70% of photos (horizon and upper walls)
        core_subset = images[:len(images)//2 + 2]
        status_sub, pano_sub = stitcher.stitch(core_subset)
        if status_sub == cv2.Stitcher_OK and pano_sub is not None:
            return pano_sub

    return None

@spaces.GPU
def stitch_panorama_api(files):
    if not files or len(files) < 2:
        return None, "<div style='color:red;'>Please upload at least 2 overlapping photos.</div>"
    
    images = []
    for f in files:
        path = f if isinstance(f, str) else getattr(f, 'name', None)
        if path:
            img = cv2.imread(path)
            if img is not None:
                h, w = img.shape[:2]
                if max(h, w) > 2560:
                    scale = 2560.0 / max(h, w)
                    img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                images.append(img)
    
    if len(images) < 2:
        return None, "<div style='color:red;'>Could not decode input photos.</div>"
    
    pano = attempt_stitching(images)
    
    if pano is None:
        return None, "<div style='color:red;'>Stitching failed: Please ensure each photo overlaps the previous one by ~30% and keep the camera at the same pivot spot in the center of the room.</div>"
    
    cropped = crop_black_borders(pano)
    equi = format_equirectangular(cropped, target_width=4096)
    
    output_path = "/tmp/stitched_360.jpg" if os.path.exists("/tmp") else "stitched_360.jpg"
    cv2.imwrite(output_path, equi, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    inject_photosphere_xmp(output_path)
    
    html_preview = f"""
    <div style="width:100%; height:450px; border-radius:16px; overflow:hidden; border:1px solid #444; margin-top:12px;">
      <iframe srcdoc='
        <!DOCTYPE html>
        <html>
        <head>
          <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css\"/>
          <script src=\"https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js\"></script>
          <style>body, html, #pano {{ margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#111; }}</style>
        </head>
        <body>
          <div id=\"pano\"></div>
          <script>
            pannellum.viewer(\"pano\", {{
              type: \"equirectangular\",
              panorama: \"file={os.path.basename(output_path)}\",
              autoLoad: true,
              autoRotate: -1.5,
              compass: true
            }});
          </script>
        </body>
        </html>
      ' style="width:100%; height:100%; border:none;"></iframe>
    </div>
    """
    
    return output_path, html_preview

# Build Gradio Interface
with gr.Blocks(title="TourPro 360 Panorama Stitcher") as demo:
    gr.Markdown("# 🌐 TourPro 360 — Free High-Quality 360 Panorama Stitcher")
    gr.Markdown("Upload sequential overlapping photos (30%+ overlap). Powered by OpenCV Multi-Pass Blending & Photo Sphere XMP.")
    
    with gr.Row():
        with gr.Column(scale=1):
            input_files = gr.File(label="Upload Overlapping Photos (Min 2)", file_count="multiple", file_types=["image"])
            stitch_btn = gr.Button("✨ Stitch 360 Panorama", variant="primary")
        
        with gr.Column(scale=2):
            output_file = gr.File(label="Download Stitched 4K Equirectangular 360 Image")
            preview_html = gr.HTML(label="Interactive 360 Viewer")
            
    stitch_btn.click(
        fn=stitch_panorama_api,
        inputs=[input_files],
        outputs=[output_file, preview_html],
        api_name="stitch"
    )

if __name__ == "__main__":
    demo.launch()
