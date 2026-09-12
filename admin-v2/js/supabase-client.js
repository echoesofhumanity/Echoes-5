// Supabase CDN kütüphanesini HTML sayfanıza eklemeyi unutmayın:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'BURAYA_PROJECT_URL_GELECEK'; 
const SUPABASE_ANON_KEY = 'BURAYA_ANON_PUBLIC_KEY_GELECEK';

// Supabase İstemcisi
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Yeni İçerik Yayınlama Fonksiyonu
async function createContentItem(payload) {
    const { data, error } = await db
        .from('content_items')
        .insert([payload])
        .select();

    if (error) {
        console.error('İçerik kaydetme hatası:', error.message);
        throw error;
    }
    return data;
}

// 2. Media Bucket'a Görsel / Dosya Yükleme Fonksiyonu
async function uploadMediaFile(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { data, error } = await db.storage
        .from('echoes-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error('Medya yükleme hatası:', error.message);
        throw error;
    }

    // Yüklenen dosyanın halka açık URL adresini al
    const { data: urlData } = db.storage
        .from('echoes-media')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// 3. İçerikleri Kategorisine Göre Çekme Fonksiyonu
async function fetchContentByCategory(slug) {
    const { data, error } = await db
        .from('content_items')
        .select('*, categories!inner(slug)')
        .eq('categories.slug', slug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Veri çekme hatası:', error.message);
        throw error;
    }
    return data;
}

