-- ============================================================
-- SQL-скрипт для настройки Supabase под викторину "Принцессы"
-- Скопируйте и выполните этот код в:
-- Supabase Dashboard -> раздел "SQL Editor" -> кнопка "New query" -> "Run"
-- ============================================================

-- 1. Создаем таблицу для хранения вопросов, ответов и принцесс
CREATE TABLE IF NOT EXISTS public.quiz_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Включаем безопасность RLS (Row Level Security)
ALTER TABLE public.quiz_state ENABLE ROW LEVEL SECURITY;

-- 3. Разрешаем чтение всем зрителям (публично)
DROP POLICY IF EXISTS "Public read quiz_state" ON public.quiz_state;
CREATE POLICY "Public read quiz_state" 
ON public.quiz_state FOR SELECT 
TO anon, authenticated 
USING (true);

-- 4. Разрешаем обновление из админ-панели
DROP POLICY IF EXISTS "Anon update quiz_state" ON public.quiz_state;
CREATE POLICY "Anon update quiz_state" 
ON public.quiz_state FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 5. Создаем публичный бакет для картинок quiz-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-assets', 'quiz-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Разрешаем публичный просмотр картинок зрителям
DROP POLICY IF EXISTS "Public read quiz-assets" ON storage.objects;
CREATE POLICY "Public read quiz-assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'quiz-assets');

-- 7. Разрешаем загрузку и удаление картинок из админки
DROP POLICY IF EXISTS "Anon upload quiz-assets" ON storage.objects;
CREATE POLICY "Anon upload quiz-assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'quiz-assets');

DROP POLICY IF EXISTS "Anon update quiz-assets" ON storage.objects;
CREATE POLICY "Anon update quiz-assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'quiz-assets');

DROP POLICY IF EXISTS "Anon delete quiz-assets" ON storage.objects;
CREATE POLICY "Anon delete quiz-assets"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'quiz-assets');

