# TourPro360 — Project Summary & Next Steps

This file serves as a checkpoint and handoff document. It contains the history of tasks, errors faced, how they were resolved, and upcoming tasks for the next chat session.

---

## 1. Project Overview & Current State
We are building **TourPro360**, a 360-degree virtual tour SaaS platform for construction builders.
* **Tech Stack**: React, Vite, Tailwind CSS, Supabase (Database & Auth), Pannellum (360 WebGL Viewer).
* **Project Structure**:
  * `/tourpro-admin`: Admin panel for builders to manage projects, upload 360 photos, and set hotspot connections.
  * `/tourpro-widget`: The client-facing embeddable 360 tour viewer widget.
  * `/tourpro-mobile`: Capacitor-based mobile application.

---

## 2. Past Tasks & Achievements
* **Supabase Integration**: Set up Database Schema for `projects`, `rooms`, and `hotspots` with proper Foreign Keys and Cascading Deletes.
* **Admin Dashboard UI**: Built the Room Manager card grid, Hotspots Connection manager form, and Live Preview page.
* **Room controls**:
  * Added **hover overlay controls** on the room cards to **Edit/Update 360 Photos** and **Delete 360 Photos** (without deleting the room entry itself).
  * Added **inline Room Rename** option next to the room name.
* **360 Image Generation**:
  * Set up a Python script `generate_panoramas.py` that connects to the Hugging Face `gokaygokay/360PanoImage` Space API.
  * Successfully generated **9 out of 13 rooms** with a consistent, premium South Indian Contemporary design theme (Villa Myra style).
* **Automatic DB Seeding**:
  * Created `populate_rooms.py` to automatically copy generated images to the `/public` folders of the admin, widget, and mobile apps, reset database rooms for the project, and set the Foyer as the default entry room.
  * Successfully pushed the static assets to GitHub to deploy on Vercel.

---

## 3. Errors Faced & Solutions

### ❌ Error 1: Vercel 404 on Page Refresh
* **Problem**: In the single-page React app on Vercel, reloading or directly accessing pages (like `/preview/:id` or `/projects/:id`) resulted in a Vercel `404 NOT_FOUND` error.
* **Solution**: Created `vercel.json` in the root of `tourpro-admin` containing rewrite rules to redirect all sub-routes to `/index.html` (handled by React Router).

### ❌ Error 2: Hugging Face ZeroGPU Rate Limits
* **Problem**: Generating high-resolution (6144x3072) images consecutively on Hugging Face using standard guest requests triggered a daily ZeroGPU rate limit after 4 images.
* **Solution**: Updated `generate_panoramas.py` to read a Hugging Face Access Token from `hf_token.txt` or env variables. When a token is supplied, Hugging Face grants a significantly higher quota, allowing the bulk generation to proceed.

### ❌ Error 3: Inconsistent Room Themes & "Foreign Look"
* **Problem**: Initial AI-generated images had duplicate objects (e.g., multiple TVs), looked cluttered, and had western aesthetics that did not match the modern South Indian villa elevation of Villa Myra.
* **Solution**: Rewrote the 13 room prompts to use a highly detailed, minimalist South Indian contemporary design language (e.g., polished ivory-cream marble floors, natural teak wood paneling, warm LED lighting, tropical palm/jasmine plants, and traditional brass urlie pots).

### ❌ Error 4: Supabase Storage Upload Auth Constraints
* **Problem**: Uploading multiple high-res panorama images directly to Supabase Storage required RLS auth tokens, causing size and permission issues during automated script runs.
* **Solution**: Saved the generated images directly into the projects' `/public/generated_360_images` directories. In the database, we set `photo_url = "/generated_360_images/<room_name>.jpg"`. This allows local and live Vercel servers to serve the images statically and instantly with zero auth/upload limits.

---

## 4. Current & Upcoming Tasks (Handoff for Next Chat)

### 📋 Task 1: Generate the remaining 4 first floor rooms
Due to the daily Hugging Face ZeroGPU quota limits, the last 4 rooms were not generated.
* **Unfinished Rooms**:
  * `10_Bedroom_2`
  * `11_Master_Bedroom`
  * `12_Master_Bathroom`
  * `13_Front_Terrace_Balcony`
* **How to continue**:
  1. Create a second free Hugging Face account and generate a new Access Token.
  2. Paste the new token inside `hf_token.txt` (replacing the old one).
  3. Run `python -u generate_panoramas.py` in the terminal to generate the remaining 4 images.
  4. Run `python populate_rooms.py` to copy them to the public folders and insert them into the database automatically.
  5. Commit and push the public folders to Git.

### 📋 Task 2: Connect the Rooms using Hotspots
Once all rooms are in the database, the virtual tour needs to connect them together.
* In the admin dashboard, go to the project details page (`https://tourpro360-admin.vercel.app/projects/309f7ab7-5e71-4be3-86c5-ee5fe22f724e`).
* Add Hotspot Connections using the form (e.g. from Foyer ➔ Dining Room, from Dining ➔ Kitchen, etc.).
* *Note: The Pitch and Yaw coordinates determine where the arrow appears in the 360-degree sphere.*

### 📋 Task 3: Adjust Double-Height Living Room Prompt
* To make the Living Room (`05_Living_Room_TV_Lounge`) match the elevation's double-height glass facade:
  * Adjust the prompt in `generate_panoramas.py` to explicitly describe a "double-height living room with a massive two-story high glass window overlooking stepping stones" and regenerate it.
