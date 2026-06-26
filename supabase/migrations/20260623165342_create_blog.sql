/*
  # Blog feature - posts table + storage

  ## New Tables

  1. `blog_posts`
     - `id` (uuid, primary key)
     - `author_id` (uuid, references auth.users) - who wrote it
     - `slug` (text, unique) - URL-friendly identifier, e.g. "kak-vybrat-format-3d-modeli"
     - `title` (text)
     - `excerpt` (text) - short summary shown in the list view
     - `content` (text) - full article body (markdown)
     - `cover_url` (text) - cover image URL from Storage
     - `tags` (text[])
     - `published` (boolean) - draft vs live
     - `published_at` (timestamptz, nullable)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anyone (anon + authenticated) can read posts where published = true
  - Only the post's author can read their own drafts
  - INSERT / UPDATE / DELETE restricted to a single hardcoded admin UUID,
    set via the `is_blog_admin()` helper function below.
    !! After creating your account, update the UUID inside is_blog_admin() !!

  ## Storage
  - New public bucket `blog-images` for covers and inline images
  - Public read, write restricted to the same admin UUID
*/

-- ── Helper: change the UUID below to YOUR auth user id after you sign up ──────
-- You can find your UUID in Supabase Dashboard → Authentication → Users
CREATE OR REPLACE FUNCTION is_blog_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid;
$$;

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  excerpt text DEFAULT '',
  content text DEFAULT '',
  cover_url text DEFAULT '',
  tags text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (published, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are public readable"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Admin can view all own posts including drafts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (is_blog_admin());

CREATE POLICY "Admin can insert posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (is_blog_admin());

CREATE POLICY "Admin can update posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (is_blog_admin())
  WITH CHECK (is_blog_admin());

CREATE POLICY "Admin can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (is_blog_admin());

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION blog_posts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_posts_set_updated_at();

-- ── Storage bucket for blog images ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view blog images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-images');

CREATE POLICY "Admin can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND is_blog_admin());

CREATE POLICY "Admin can update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images' AND is_blog_admin());

CREATE POLICY "Admin can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images' AND is_blog_admin());
