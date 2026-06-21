-- ============================================================================
-- TOURPRO360 - SUPABASE DATABASE SCHEMA
-- ============================================================================

-- 1. Projects Table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  building_name TEXT NOT NULL,
  city TEXT,
  building_type TEXT CHECK (building_type IN ('Residential', 'Commercial', 'Villa', 'Apartment', 'Plot')),
  entry_room_id UUID,
  is_live BOOLEAN DEFAULT false,
  embed_token TEXT DEFAULT gen_random_uuid()::text UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Rooms Table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add Foreign Key for entry_room_id to Projects
ALTER TABLE projects
  ADD CONSTRAINT fk_entry_room
  FOREIGN KEY (entry_room_id) REFERENCES rooms(id) ON DELETE SET NULL;

-- 4. Hotspots Table
CREATE TABLE hotspots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  to_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  pitch FLOAT DEFAULT 0,
  yaw FLOAT DEFAULT 0,
  label TEXT DEFAULT 'Go to next room',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- ADMIN (Suresh) Policies: Full CRUD access for authenticated users
CREATE POLICY "Admin full access" ON projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access" ON rooms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access" ON hotspots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PUBLIC (Embed Widget / Visitor) Policies: Read-only access to live tours
CREATE POLICY "Public read live projects" ON projects
  FOR SELECT TO anon, authenticated USING (is_live = true);

CREATE POLICY "Public read rooms" ON rooms
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = rooms.project_id AND p.is_live = true
    )
  );

CREATE POLICY "Public read hotspots" ON hotspots
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = hotspots.from_room_id AND p.is_live = true
    )
  );
