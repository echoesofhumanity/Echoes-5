    // =========================================================
    // ECHOES OF HUMANITY — SUPABASE CLIENT
    // Admin CMS Service Layer
    // =========================================================

    // Supabase istemcisi supabase-config.js tarafından oluşturulur.
    // Bu dosya doğrudan window.db istemcisini kullanır.

    if (!window.db) {
        throw new Error(
            'Supabase istemcisi başlatılamadı. ' +
            'supabase-config.js yüklenmemiş olabilir.'
        );
    }

    const db = window.db;

    // ---------------------------------------------------------
    // YARDIMCI
    // ---------------------------------------------------------

    function normalizeContentPayload(payload) {

        return {
            title: payload.title || '',
            slug: payload.slug || '',
            subtitle: payload.subtitle || null,
            summary: payload.summary || null,
            body: payload.body || null,
            type: payload.type || 'story',
            status: payload.status || 'draft',
            language: payload.language || 'tr',
            region_code: payload.region_code || null,
            category_id: payload.category_id || null,
            tags: Array.isArray(payload.tags)
                ? payload.tags
                : [],
            cover_image_url:
                payload.cover_image_url || null,
            file_path:
                payload.file_path || null,
            featured:
                payload.featured === true,
            views_count:
                Number.isInteger(payload.views_count)
                    ? payload.views_count
                    : 0,
            published_at:
                payload.published_at || null
        };
    }

    // ---------------------------------------------------------
    // YENİ İÇERİK OLUŞTUR
    // ---------------------------------------------------------

    async function createContentItem(payload) {

        const cleanPayload =
            normalizeContentPayload(payload);

        const {
            data,
            error
        } = await db
            .from('content_items')
            .insert([cleanPayload])
            .select()
            .single();

        if (error) {

            console.error(
                'İçerik kaydetme hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // İÇERİK GÜNCELLE
    // ---------------------------------------------------------

    async function updateContentItem(id, payload) {

        if (!id) {
            throw new Error(
                'Güncellenecek içerik ID bulunamadı.'
            );
        }

        const cleanPayload =
            normalizeContentPayload(payload);

        cleanPayload.updated_at =
            new Date().toISOString();

        const {
            data,
            error
        } = await db
            .from('content_items')
            .update(cleanPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {

            console.error(
                'İçerik güncelleme hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // TEK İÇERİK GETİR
    // ---------------------------------------------------------

    async function getContentItem(id) {

        if (!id) {
            throw new Error(
                'İçerik ID bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .eq('id', id)
            .single();

        if (error) {

            console.error(
                'İçerik getirme hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // MEDYA YÜKLE
    // ---------------------------------------------------------

    async function uploadMediaFile(file) {

        if (!file) {
            return {
                publicUrl: null,
                filePath: null
            };
        }

        const safeName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '-');

        const filePath =
            `covers/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const {
            error: uploadError
        } = await db
            .storage
            .from('echoes-media')
            .upload(
                filePath,
                file,
                {
                    cacheControl: '3600',
                    upsert: false
                }
            );

        if (uploadError) {

            console.error(
                'Medya yükleme hatası:',
                uploadError
            );

            throw uploadError;
        }

        const {
            data: urlData
        } = db
            .storage
            .from('echoes-media')
            .getPublicUrl(filePath);

        return {
            publicUrl:
                urlData?.publicUrl || null,

            filePath:
                filePath
        };
    }

    // ---------------------------------------------------------
    // STORAGE MEDYA SİL
    // ---------------------------------------------------------

    async function deleteMediaFile(filePath) {

        if (!filePath) {
            return true;
        }

        const {
            error
        } = await db
            .storage
            .from('echoes-media')
            .remove([filePath]);

        if (error) {

            console.error(
                'Medya silme hatası:',
                error
            );

            throw error;
        }

        return true;
    }

    // ---------------------------------------------------------
    // İÇERİK ARŞİVLE
    // ---------------------------------------------------------

    async function archiveContentItem(id) {

        if (!id) {
            throw new Error(
                'Arşivlenecek içerik ID bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .update({
                status: 'archived',
                updated_at:
                    new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {

            console.error(
                'İçerik arşivleme hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // ARŞİVDEN GERİ YÜKLE
    // ---------------------------------------------------------

    async function restoreContentItem(id) {

        if (!id) {
            throw new Error(
                'Geri yüklenecek içerik ID bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .update({
                status: 'draft',
                published_at: null,
                updated_at:
                    new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {

            console.error(
                'İçerik geri yükleme hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // İÇERİĞİ YAYINLA
    // ---------------------------------------------------------

    async function publishContentItem(id) {

        if (!id) {
            throw new Error(
                'Yayınlanacak içerik ID bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .update({
                status: 'published',
                published_at:
                    new Date().toISOString(),
                updated_at:
                    new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {

            console.error(
                'İçerik yayınlama hatası:',
                error
            );

            throw error;
        }

        return data;
    }

    // ---------------------------------------------------------
    // KALICI İÇERİK SİLME
    // ---------------------------------------------------------

    async function permanentlyDeleteContentItem(id) {

        if (!id) {
            throw new Error(
                'Silinecek içerik ID bulunamadı.'
            );
        }

        // Önce içerik kaydını getir.
        const {
            data: item,
            error: fetchError
        } = await db
            .from('content_items')
            .select('id, status, cover_image_url, file_path')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Güvenlik: kalıcı silme sadece arşiv için.
        if (item.status !== 'archived') {
            throw new Error(
                'Kalıcı silme yalnızca arşivlenmiş içerikler için yapılabilir.'
            );
        }

        // Storage dosyasını önce sil.
        if (item.file_path) {
            await deleteMediaFile(
                item.file_path
            );
        }

        // Sonra database kaydını sil.
        const {
            error: deleteError
        } = await db
            .from('content_items')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return true;
            }

    // ---------------------------------------------------------
    // YAYINLANMIŞ İÇERİKLERİ KATEGORİYE GÖRE GETİR
    // ---------------------------------------------------------

    async function fetchContentByCategory(slug) {

        if (!slug) {
            throw new Error(
                'Kategori slug bilgisi bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .eq('status', 'published')
            .eq('categories.slug', slug)
            .order(
                'created_at',
                { ascending: false }
            );

        if (error) {

            console.error(
                'Kategori içerikleri getirme hatası:',
                error
            );

            throw error;
        }

        return data || [];
    }

    // ---------------------------------------------------------
    // TÜM KATEGORİLERİ GETİR
    // ---------------------------------------------------------

    async function fetchCategories() {

        const {
            data,
            error
        } = await db
            .from('categories')
            .select(`
                id,
                name,
                slug,
                parent_id,
                description,
                icon,
                created_at,
                updated_at
            `)
            .order(
                'name',
                { ascending: true }
            );

        if (error) {

            console.error(
                'Kategori getirme hatası:',
                error
            );

            throw error;
        }

        return data || [];
    }

    // ---------------------------------------------------------
    // KATEGORİ ID'SİNE GÖRE İÇERİKLER
    // ---------------------------------------------------------

    async function fetchContentByCategoryId(categoryId) {

        if (!categoryId) {
            throw new Error(
                'Kategori ID bulunamadı.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .eq(
                'category_id',
                categoryId
            )
            .order(
                'created_at',
                { ascending: false }
            );

        if (error) {

            console.error(
                'Kategori içerikleri getirme hatası:',
                error
            );

            throw error;
        }

        return data || [];
    }

    // ---------------------------------------------------------
    // TÜM İÇERİKLERİ GETİR
    // ---------------------------------------------------------

    async function fetchAllContent() {

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .order(
                'created_at',
                { ascending: false }
            );

        if (error) {

            console.error(
                'İçerik listesi getirme hatası:',
                error
            );

            throw error;
        }

        return data || [];
    }

    // ---------------------------------------------------------
    // DURUM BAZLI İÇERİKLER
    // ---------------------------------------------------------

    async function fetchContentByStatus(status) {

        if (!status) {
            throw new Error(
                'İçerik durumu belirtilmedi.'
            );
        }

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .eq('status', status)
            .order(
                'created_at',
                { ascending: false }
            );

        if (error) {

            console.error(
                'Durum bazlı içerik getirme hatası:',
                error
            );

            throw error;
        }

        return data || [];
    }

    // ---------------------------------------------------------
    // DASHBOARD İSTATİSTİKLERİ
    // ---------------------------------------------------------

    async function getContentStats() {

        const {
            data,
            error
        } = await db
            .from('content_items')
            .select(
                'id,status,type,language,category_id'
            );

        if (error) {

            console.error(
                'Dashboard istatistik hatası:',
                error
            );

            throw error;
        }

        const items = data || [];

        return {
            total: items.length,

            draft: items.filter(
                item => item.status === 'draft'
            ).length,

            review: items.filter(
                item => item.status === 'review'
            ).length,

            published: items.filter(
                item => item.status === 'published'
            ).length,

            archived: items.filter(
                item => item.status === 'archived'
            ).length,

            story: items.filter(
                item => item.type === 'story'
            ).length,

            essay: items.filter(
                item => item.type === 'essay'
            ).length,

            manifesto: items.filter(
                item => item.type === 'manifesto'
            ).length,

            poetry: items.filter(
                item => item.type === 'poetry'
            ).length,

            audio: items.filter(
                item => item.type === 'audio'
            ).length,

            visual: items.filter(
                item => item.type === 'visual'
            ).length,

            technical: items.filter(
                item => item.type === 'technical'
            ).length,

            blueprint: items.filter(
                item => item.type === 'blueprint'
            ).length
        };
    }

    // ---------------------------------------------------------
    // GLOBAL ERİŞİM
    // ---------------------------------------------------------
    // Diğer admin dosyalarının servis fonksiyonlarına
    // güvenli şekilde erişebilmesi için window üzerine koyuyoruz.

    window.EchoesAdmin = {
        createContentItem,
        updateContentItem,
        getContentItem,

        uploadMediaFile,
        deleteMediaFile,

        archiveContentItem,
        restoreContentItem,
        publishContentItem,
        permanentlyDeleteContentItem,

        fetchContentByCategory,
        fetchContentByCategoryId,
        fetchCategories,
        fetchAllContent,
        fetchContentByStatus,

        getContentStats
    };
