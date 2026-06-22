# 🌐 TourPro360 — Free & Open Source 360° Panorama Assets & Templates

This document contains a curated list of free, open-source 360-degree panoramic image databases, ready-to-use sample links, and GitHub templates that you can use to build high-fidelity demos for your construction portfolio.

---

## 1. 📸 Free 360° Equirectangular Images (CC0 & Public Domain)

To build realistic virtual tour demos for architects, builders, or property managers without copyright issues, you can download panoramic images from these platforms:

### A. Poly Haven (Indoor HDRI)
Poly Haven is the premier asset library for 3D designers. All interior renders and HDRIs are released under **CC0 (Public Domain)**, meaning they are free to use commercially without login, credentials, or attribution.
*   **HDRI Library:** [Poly Haven HDRIs](https://polyhaven.com/hdris)
*   **Filter Category:** Select **Indoor** in the sidebar to find high-quality luxury rooms, foyers, modern halls, and industrial interior spaces.
*   **How to Download for WebGL (Pannellum):**
    1.  Select a room (e.g., *Modern Living Room*, *Studio*, *Glasshouse*).
    2.  In the download panel, choose the format as **JPG** (or download the HDRI and convert it).
    3.  Choose **4K or 8K** resolution.
    4.  Download the tone-mapped panorama.

### B. Wikimedia Commons (360° Panoramas)
 A community-driven repository containing hundreds of real-world panoramic photos uploaded under public domain licenses.
*   **Main Category:** [Wikimedia Commons 360° Panoramas](https://commons.wikimedia.org/wiki/Category:360%C2%B0_panoramas)
*   You can search within this category for terms like "interior," "room," "house," "museum," or "lobby" to find equirectangular JPEGs.

### C. Official Pannellum Samples (Direct Links)
If you need immediate URLs to test your code, you can use these official panoramic samples hosted by the Pannellum library (ensure your code allows CORS when fetching):
*   **ALMA Telescope Facility (Outdoor):** [alma.jpg](https://pannellum.org/images/alma.jpg)
*   **ALMA Correlator Server Room (Indoor):** [alma-correlator-facility.jpg](https://pannellum.org/images/alma-correlator-facility.jpg)
*   **Tocopilla (Street View/Outdoor):** [tocopilla.jpg](https://pannellum.org/images/tocopilla.jpg)
*   **Charles Street (Modern Building/Cityscape):** [charles-street.jpg](https://pannellum.org/images/charles-street.jpg)

---

## 2. 📂 Open Source Virtual Tour Templates (GitHub Projects)

If you want to review existing virtual tour implementations or leverage modular code templates, check out these GitHub projects:

*   **[3Sixty-WebTour-Maker](https://github.com/alonsoMartin/3Sixty-WebTour-Maker)**: A WebGL 360° virtual tour creator built on top of **Three.js** and **Panolens.js**. Good for studying drag-and-drop hotspot placement.
*   **[VRTourEditor](https://github.com/S-K-P/VRTourEditor)**: A simple web-based editor that lets you upload images, configure transition links, and download the standalone site packages.
*   **[Pannellum GitHub Repository](https://github.com/mpetroff/pannellum)**: The official source repository for Pannellum.js. Useful for reviewing raw configuration examples and custom hotspot templates.
*   **[Virtual Tour Topic on GitHub](https://github.com/topics/virtual-tour)**: A broad registry listing hundreds of repositories implementing 360° panoramic tools using Three.js, React, or A-Frame.

---

## 🛠️ Step-by-Step: Adding Free Demos to TourPro360

To turn these open-source images into virtual tour showcases on your platform:

1.  **Download & Prepare:**
    *   Download your selected 360° image from **Poly Haven** (Tone-mapped JPG, 4K resolution `4096x2048`).
    *   If the image is larger than 4K (e.g. 6K or 8K), use your local downscaling script `resize_panoramas.py` to resize it to `4096x2048` to avoid WebGL memory crashes on mobile devices.
2.  **Upload via Dashboard:**
    *   Open your **TourPro360 Admin Dashboard**.
    *   Create a new client (e.g., "Demo Luxury Villa") or project.
    *   Upload the downloaded JPEGs to the respective rooms (e.g., "Living Room", "Foyer", "Kitchen").
3.  **Place Hotspots:**
    *   Preview the tour and calculate the `pitch` and `yaw` coordinates to connect the rooms.
    *   Add hotspot arrows to walk between the spaces.
4.  **Embed Gallery:**
    *   Copy the unified Portfolio Embed Widget code and place it on your main portfolio page to showcase the completed virtual walkthrough!
