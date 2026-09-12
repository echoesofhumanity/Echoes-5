// Supabase CDN kütüphanesini HTML sayfanıza eklemeyi unutmayın:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://nlawhidxubmnoxtcxbiq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYXdoaWR4dWJubW94dGN4YmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTQ0NzYsImV4cCI6MjEwNDI3MDQ3Nn0.UlthQVGVGU5G3d1_A0gTLq06NJTmdhEwKoYKyWQ8k4g';

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

