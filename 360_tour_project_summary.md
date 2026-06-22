# TourPro360 — Project Summary & Handoff Blueprint

This document contains a comprehensive record of the **TourPro360** platform, detailing its architecture, code modifications, scripting pipelines, open-source references, and compile setups. It is designed to be fed into any new AI chat session to resume work immediately with zero context loss and minimal token consumption.

---

## 1. Project Architecture & Repositories

**TourPro360** is a 360-degree virtual tour SaaS platform for construction builders.
- **Parent Workspace**: `D:\anti gravity\Demo\360 feature`
- **Sub-Projects**:
  1. `/tourpro-admin`: React + Vite + Tailwind CSS admin portal for managing projects, uploading 360 room photos, and placing hotspot navigation links.
  2. `/tourpro-widget`: Vanilla JS + WebGL embeddable 360 viewer widget for client portfolios.
  3. `/360_Capture`: Native Android utility app for capturing panoramas.

---

## 2. 📱 Android App: `360_Capture`
Located at: [360_Capture](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture)

### A. Package Renaming & Namespace Specs
- **Identifier Update**: Renamed from `com.example.360capture` to **`com.example.capture360`** to comply with Java/Kotlin rules (which prohibit packages from starting with numbers).
- **Gradle File**: Configured in [app/build.gradle.kts](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/build.gradle.kts) (`namespace` and `applicationId`).
- **Manifest File**: Updated [AndroidManifest.xml](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/src/main/AndroidManifest.xml) with correct activity references and declared permissions:
  - `android.permission.CAMERA` (Dynamic runtime prompts implemented)
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `android.permission.ACCESS_WIFI_STATE`
  - `android.permission.CHANGE_WIFI_STATE`

### B. Screen Interfaces (Jetpack Compose)
1. **[MainScreen.kt](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/src/main/java/com/example/capture360/ui/main/MainScreen.kt)**: Card-based dashboard with top appbar and horizontal gradients for Option A and Option B selection.
2. **[CameraConnectScreen.kt](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/src/main/java/com/example/capture360/ui/CameraConnectScreen.kt) (Option A)**:
   - Queries hardware metrics via the **Open Spherical Camera (OSC) API** (battery, storage, model info).
   - Triggers shutter, polls capture state, and pulls the completed image from the camera server.
   - Embeds a native `WebView` running **Pannellum** to view the live 360 panorama.
3. **[ImageStitchScreen.kt](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/src/main/java/com/example/capture360/ui/ImageStitchScreen.kt) (Option B)**:
   - Uses **CameraX** to capture a sequence of overlapping photos.
   - Launches dynamic camera permission prompts and renders a camera preview layer.
   - Triggers background stitching using coroutines (`Dispatchers.Default`) to avoid App Not Responding (ANR) lockups.

### C. Custom Kotlin OpenCV Stitcher
Since standard precompiled OpenCV Java SDK bindings **do not include** the native C++ `cv::Stitcher` module, we implemented a custom stitching pipeline in [OpenCVStitcher.kt](file:///D:/anti%20gravity/Demo/360%20feature/360_Capture/app/src/main/java/com/example/capture360/stitch/OpenCVStitcher.kt):
1. **Feature Detection**: Instantiates an **ORB Detector** (`ORB.create(1000)`) to extract keypoints and descriptors from images.
2. **Feature Matching**: Uses a **Brute-Force Hamming Matcher** (`BFMatcher.create(DescriptorMatcher.BRUTEFORCE_HAMMING, true)`) to find matched coordinates.
3. **Homography Estimation**: Calculates a perspective transform matrix between matched points using **RANSAC** (`Calib3d.findHomography`).
4. **Warp Perspective**: Blends the second image onto the first image coordinate space using `Imgproc.warpPerspective`.
5. **Border Trimming**: Converts the combined canvas to grayscale, estimates non-black borders using `Core.findNonZero`, and crops the output to its bounding box via `Imgproc.boundingRect` to remove skewed black borders.

### D. Compile & Build Setup
To build the app debug APK using the Java runtime environment bundled inside Android Studio:
```powershell
# Set JBR path and run Gradle assemble
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```
- **Output APK Path**: `D:\anti gravity\Demo\360 feature\360_Capture\app\build\outputs\apk\debug\app-debug.apk`

---

## 3. 🌐 Web Tour Dashboard & Widget
Located at: `/tourpro-admin` & `/tourpro-widget`

### A. Floor Accordion Sidebar Menus
- Organized the room list by floor sections ("Ground Floor", "First Floor").
- **Admin Preview Panel (`TourPreview.jsx`)**: Implemented React collapsible accordion menus. Removed the redundant floor prefix from room buttons (e.g. showing "Dining Hall" grouped under "Ground Floor").
- **Widget Embedded Panel (`main.js`)**: Implemented Vanilla JS accordion blocks with arrow transitions.
- **Auto-expansion**: Clicking a hotspot to navigate to a room on a different floor automatically expands its corresponding floor accordion panel in the sidebar.

### B. WebGL 4K Resolution Downscaling
- **Error**: Mobile devices and lower-end GPUs (e.g., 2GB VRAM GPUs) crash or show an infinite "Loading..." spinner when loading 6K images due to WebGL texture limits (MAX_TEXTURE_SIZE = 4096).
- **Fix**: Generated panoramas (`6144x3072`) are downscaled to 4K (`4096x2048`) using Lanczos resampling. This decreases graphics VRAM usage from ~75MB to ~33MB per texture, resolving rendering failures and loading images instantly (1-2s).

---

## 4. 🗄️ Supabase Schema & Seeding scripts

- **Schema**: Maps `projects`, `rooms`, and `hotspots` tables with cascade deletes on foreign keys.
- **`generate_panoramas.py`**: Interacts with the Hugging Face `gokaygokay/360PanoImage` API using a token from `hf_token.txt` to bypass rate limits. Generates South Indian contemporary style rooms (ivory marble, teak accents, modern layouts).
- **`populate_rooms.py`**: Copies 4K images to `/public/generated_360_images/` in the projects, clears the database, seeds new floor-separated room entries, and designates the "Entrance Lobby" as the default entry point.

---

## 5. 📚 Open Source & Reference Materials

Here are the open-source materials, standards, and libraries utilized:

1. **OpenCV Android SDK**:
   - Prebuilt Maven Dependency: `org.opencv:opencv:4.9.0`
   - Official Releases and SDK documentation: [OpenCV Releases](https://opencv.org/releases/)
   - Keypoint detection and homography reference: [OpenCV Stitcher JNI/Native JNI Wrappers](https://github.com/PrasoonDhaneshwar/PanoramaStitching-Android-OpenCV)
2. **Open Spherical Camera (OSC) API**:
   - Google Open Spherical Camera project API guidelines for camera communication (Wifi 192.168.1.1, `/osc/info`, `/osc/state`, and `/osc/commands/execute` actions): [OSC Developer Documentation](https://developers.google.com/streetview/open-spherical-camera)
3. **Pannellum WebGL Viewer**:
   - Lightweight WebGL panoramic viewer loaded via CDN: `https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js`
   - Official Pannellum documentation and config params: [Pannellum API Reference](https://pannellum.org/)
4. **Android Architecture**:
   - **CameraX API**: For capturing raw frames in Option B. [CameraX Guides](https://developer.android.com/training/camerax)
   - **Retrofit**: Type-safe HTTP client for Android. [Retrofit GitHub](https://github.com/square/retrofit)
   - **Coil-Compose**: Image loading library for Jetpack Compose. [Coil Docs](https://coil-kt.github.io/coil/)

