/**
 * Модуль инициализации и работы с Supabase
 * Позволяет:
 * 1. Читать и обновлять вопросы и персонажей в реальном времени
 * 2. Загружать картинки в Supabase Storage (бакет quiz-assets)
 */

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  return String(rawUrl)
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/auth\/v1\/?$/i, '')
    .replace(/\/storage\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

window.SUPABASE_CONFIG = {
  // Можно прописать URL и ключ прямо здесь, либо ввести в admin.html на вкладке Настройки
  url: normalizeSupabaseUrl(localStorage.getItem('supabase_url') || ''),
  anonKey: (localStorage.getItem('supabase_anon_key') || '').trim(),
  bucketName: 'quiz-assets',
  tableName: 'quiz_state'
};

let _supabaseClient = null;

function getSupabase() {
  if (_supabaseClient) return _supabaseClient;

  const rawUrl = window.SUPABASE_CONFIG.url || localStorage.getItem('supabase_url');
  const url = normalizeSupabaseUrl(rawUrl);
  const key = (window.SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key') || '').trim();

  if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      _supabaseClient = window.supabase.createClient(url, key);
      return _supabaseClient;
    } catch (e) {
      console.warn('Ошибка инициализации Supabase:', e);
      return null;
    }
  }
  return null;
}

// Загрузка актуального квиза из Supabase
async function fetchQuizFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .select('data')
      .eq('id', 'default')
      .single();

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return null;
    }

    if (data && data.data) {
      return data.data;
    }
  } catch (err) {
    console.warn('Ошибка связи с Supabase:', err);
  }
  return null;
}

// Сохранение квиза в Supabase
async function saveQuizToSupabase(quizData) {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase не настроен' };

  try {
    const { data, error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .upsert({
        id: 'default',
        data: quizData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Ошибка сохранения в Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Загрузка изображения в Supabase Storage
async function uploadImageToSupabase(file, prefix = 'img') {
  const client = getSupabase();

  // Если Supabase не подключен — конвертируем в локальный Data URL (Base64)
  if (!client) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        publicUrl: reader.result,
        isLocal: true,
        warning: 'Supabase не подключен — картинка сохранена локально в браузере'
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanPrefix}_${Date.now()}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await client.storage
      .from(window.SUPABASE_CONFIG.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = client.storage
      .from(window.SUPABASE_CONFIG.bucketName)
      .getPublicUrl(filePath);

    return {
      publicUrl: urlData.publicUrl,
      isLocal: false
    };
  } catch (err) {
    console.error('Ошибка загрузки файла в Supabase Storage:', err);
    throw err;
  }
}
