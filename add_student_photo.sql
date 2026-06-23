-- Step 1: Add profile_image_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Step 2: Create the storage bucket for student photos
-- Run this once in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Storage policies (allow authenticated users to upload/update/delete, public read)
CREATE POLICY "authenticated_upload_student_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "public_read_student_photos"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'student-photos');

CREATE POLICY "authenticated_update_student_photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "authenticated_delete_student_photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos');
