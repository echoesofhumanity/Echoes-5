document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // ECHOES OF HUMANITY — ADMIN PANEL V2
    // Content Management System
    // =========================================================

    const db = window.db;

    if (!db) {
        alert('Supabase bağlantısı bulunamadı.');
        return;
    }

        // ---------------------------------------------------------
    // ADMIN ROLE
    // ---------------------------------------------------------

    let currentAdminRole = null;

    let currentAdminPermissions = [];

    async function loadAdminRole() {
        try {
            const {
                data: { user },
                error: userError
            } = await db.auth.getUser();

            if (userError) throw userError;
            if (!user) throw new Error('Aktif kullanıcı bulunamadı.');

            const { data, error } = await db
                .from('admin_user_roles')
                .select(`
                    role_id,
                    admin_roles (
                        name,
                        slug
                    )
                `)
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            currentAdminRole = data?.admin_roles || null;

            window.adminRole = currentAdminRole;

                        // -------------------------------------------------
            // ACTIVE ADMIN ROLE DISPLAY
            // -------------------------------------------------

            const brand = document.querySelector('.brand');

            if (brand) {
                let roleBadge = document.getElementById(
                    'activeAdminRole'
                );

                if (!roleBadge) {
                    roleBadge = document.createElement('div');
                    roleBadge.id = 'activeAdminRole';

                    roleBadge.style.marginTop = '8px';
                    roleBadge.style.display = 'inline-block';
                    roleBadge.style.padding = '5px 10px';
                    roleBadge.style.borderRadius = '999px';
                    roleBadge.style.background = '#0f2a3d';
                    roleBadge.style.border = '1px solid #38bdf8';
                    roleBadge.style.color = '#38bdf8';
                    roleBadge.style.fontSize = '12px';
                    roleBadge.style.fontWeight = '600';

                    brand.appendChild(roleBadge);
                }

                roleBadge.textContent =
                    'Rol: ' +
                    (currentAdminRole?.name || 'Tanımsız');
            }

            console.log(
                'Admin rolü:',
                currentAdminRole?.name || 'Rol bulunamadı'
            );

        } catch (error) {
            console.error(
                'Admin rolü yüklenemedi:',
                error
            );

            currentAdminRole = null;
            window.adminRole = null;
        }
    }

        // ---------------------------------------------------------
    // ADMIN PERMISSIONS
    // ---------------------------------------------------------

    async function loadAdminPermissions() {
        try {
            if (!currentAdminRole?.slug) {
                currentAdminPermissions = [];
                window.adminPermissions = [];
                return;
            }

            const { data, error } = await db
                .from('admin_role_permissions')
                .select(`
                    admin_permissions (
                        name,
                        slug
                    )
                `)
                .eq(
                    'role_id',
                    (
                        await db
                            .from('admin_roles')
                            .select('id')
                            .eq('slug', currentAdminRole.slug)
                            .maybeSingle()
                    ).data?.id
                );

            if (error) throw error;

            currentAdminPermissions = (data || [])
                .map(item => item.admin_permissions)
                .filter(Boolean);

            window.adminPermissions = currentAdminPermissions;

            console.log(
                'Admin izinleri:',
                currentAdminPermissions.map(
                    permission => permission.slug
                )
            );

        } catch (error) {
            console.error(
                'Admin izinleri yüklenemedi:',
                error
            );

            currentAdminPermissions = [];
            window.adminPermissions = [];
        }
    }

        // ---------------------------------------------------------
    // PERMISSION CHECK
    // ---------------------------------------------------------

    function hasPermission(permissionSlug) {
        if (!permissionSlug) {
            return false;
        }

        return currentAdminPermissions.some(
            permission => permission.slug === permissionSlug
        );
    }

    window.hasAdminPermission = hasPermission;
    
    // ---------------------------------------------------------
    // ELEMENTLER
    // ---------------------------------------------------------

    const btnPublish = document.getElementById('btnPublish');
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    const btnClear = document.getElementById('btnClear');
    const btnRefresh = document.getElementById('btnRefresh');

    const titleInput = document.getElementById('contentTitle');
    const typeSelect = document.getElementById('contentType');
    const langSelect = document.getElementById('contentLanguage');
    const categoryInput = document.getElementById('contentCategory');
    const descriptionInput = document.getElementById('contentDescription');
    const tagsInput = document.getElementById('contentTags');
    const fileInput = document.getElementById('contentFile');
    const editingIdInput = document.getElementById('editingId');

    const libraryList = document.getElementById('libraryList');

    // ---------------------------------------------------------
    // DURUM
    // ---------------------------------------------------------

    let editingId = null;
    let libraryLoading = false;
let libraryRequestId = 0;
    let categories = [];

    // ---------------------------------------------------------
    // YARDIMCI FONKSİYONLAR
    // ---------------------------------------------------------

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function createSlug(text) {
        return String(text || '')
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function formatDate(date) {
        if (!date) return '-';

        try {
            return new Date(date).toLocaleString('tr-TR', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        } catch {
            return date;
        }
    }

    function statusLabel(status) {
        const labels = {
            draft: 'Taslak',
            review: 'İncelemede',
            published: 'Yayında',
            archived: 'Arşiv'
        };

        return labels[status] || status || '-';
    }

    function typeLabel(type) {
        const labels = {
            story: 'Story',
            essay: 'Essay',
            manifesto: 'Manifesto',
            poetry: 'Poetry',
            audio: 'Audio',
            visual: 'Visual',
            technical: 'Technical',
            blueprint: 'Blueprint'
        };

        return labels[type] || type || '-';
    }

    function getSelectedCategoryId() {

    const categorySelect =
        document.getElementById('contentCategory');

    if (!categorySelect) {
        return null;
    }

    return categorySelect.value || null;
    }

    function setButtonsDisabled(disabled) {
        if (btnPublish) btnPublish.disabled = disabled;
        if (btnSaveDraft) btnSaveDraft.disabled = disabled;
        if (btnClear) btnClear.disabled = disabled;
            }

        // ---------------------------------------------------------
    // KATEGORİ SİSTEMİ
    // ---------------------------------------------------------

    async function loadCategories() {
        if (!categoryInput) return;

        try {
            const { data, error } = await db
                .from('categories')
                .select('id, name, slug, parent_id')
                .order('name', { ascending: true });

            if (error) throw error;

            categories = data || [];

            if (categoryInput.tagName.toLowerCase() !== 'select') {

                const select = document.createElement('select');

                select.id = categoryInput.id;
                select.name = categoryInput.name || categoryInput.id;

                select.style.cssText =
                    categoryInput.style.cssText ||
                    'width:100%; padding:10px;';

                categoryInput.parentNode.replaceChild(
                    select,
                    categoryInput
                );
            }

            const categorySelect =
                document.getElementById('contentCategory');

            if (!categorySelect) return;

            categorySelect.innerHTML =
                '<option value="">Kategori seçin</option>';

            const parents =
                categories.filter(category => !category.parent_id);

            const children =
                categories.filter(category => category.parent_id);

            parents.forEach(parent => {

                const parentOption =
                    document.createElement('option');

                parentOption.value = parent.id;
                parentOption.textContent = parent.name;

                categorySelect.appendChild(parentOption);

                children
                    .filter(child =>
                        child.parent_id === parent.id
                    )
                    .forEach(child => {

                        const childOption =
                            document.createElement('option');

                        childOption.value = child.id;
                        childOption.textContent =
                            '— ' + child.name;

                        categorySelect.appendChild(
                            childOption
                        );
                    });
            });

            children
                .filter(child =>
                    !parents.some(
                        parent =>
                            parent.id === child.parent_id
                    )
                )
                .forEach(child => {

                    const option =
                        document.createElement('option');

                    option.value = child.id;
                    option.textContent = child.name;

                    categorySelect.appendChild(option);
                });

        } catch (error) {

            console.error(
                'Kategori yükleme hatası:',
                error
            );

            if (categoryInput) {
                categoryInput.innerHTML =
                    '<option value="">Kategori yüklenemedi</option>';
            }
        }
    }

    // ---------------------------------------------------------
    // MEDYA YÜKLEME
    // ---------------------------------------------------------

    async function uploadMedia(file) {

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
            `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await db
            .storage
            .from('echoes-media')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = db
            .storage
            .from('echoes-media')
            .getPublicUrl(filePath);

        return {
            publicUrl: data?.publicUrl || null,
            filePath: filePath
        };
    }

    // ---------------------------------------------------------
    // FORM TEMİZLE
    // ---------------------------------------------------------

    function clearForm() {

        editingId = null;

        if (editingIdInput) {
            editingIdInput.value = '';
        }

        if (titleInput) {
            titleInput.value = '';
        }

        if (descriptionInput) {
            descriptionInput.value = '';
        }

        if (tagsInput) {
            tagsInput.value = '';
        }

        if (fileInput) {
            fileInput.value = '';
        }

        const categorySelect =
    document.getElementById('contentCategory');

if (categorySelect) {
    categorySelect.value = '';
}

        if (typeSelect) {
            typeSelect.value = 'story';
        }

        if (langSelect) {
            langSelect.value = 'tr';
        }

        if (btnPublish) {
            btnPublish.textContent = 'Yayınla';
        }

        if (btnSaveDraft) {
            btnSaveDraft.textContent = 'Taslak Kaydet';
        }

        const heading =
            document.getElementById('contentFormTitle');

        if (heading) {
            heading.textContent = 'Yeni İçerik';
        }
    }

    // ---------------------------------------------------------
    // FORM VERİSİ
    // ---------------------------------------------------------

    function getFormData(status) {

        const title = titleInput
            ? titleInput.value.trim()
            : '';

        const description = descriptionInput
            ? descriptionInput.value.trim()
            : '';

        const tags = tagsInput
            ? tagsInput.value
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
            : [];

        if (!title) {
            throw new Error(
                'Lütfen içerik başlığını girin.'
            );
        }

        if (!description) {
            throw new Error(
                'Lütfen içerik / açıklama alanını doldurun.'
            );
        }

        if (!typeSelect || !typeSelect.value) {
            throw new Error(
                'Lütfen içerik türünü seçin.'
            );
        }

        if (!langSelect || !langSelect.value) {
            throw new Error(
                'Lütfen dili seçin.'
            );
        }

     const categoryId =
    getSelectedCategoryId();

if (!categoryId) {
    throw new Error(
        'Lütfen bir kategori seçin.'
    );
}

return {
    title: title,
    slug: createSlug(title),
    summary: description,
    body: description,
    type: typeSelect.value,
    language: langSelect.value,
    status: status,
    category_id: categoryId,
    tags: tags
};
    }

            // ---------------------------------------------------------
    // İÇERİK KAYDET / GÜNCELLE
    // ---------------------------------------------------------

    async function saveForm(status) {

        setButtonsDisabled(true);

        try {

            const payload = getFormData(status);

            let mediaUrl = null;
            let mediaPath = null;

            if (
                fileInput &&
                fileInput.files &&
                fileInput.files[0]
            ) {

                const media =
                    await uploadMedia(fileInput.files[0]);

                mediaUrl = media.publicUrl;
                mediaPath = media.filePath;
            }

            // -------------------------------------------------
            // MEVCUT İÇERİĞİ GÜNCELLE
            // -------------------------------------------------

            if (editingId) {

                const updatePayload = {
                    ...payload,
                    updated_at: new Date().toISOString()
                };

                if (mediaUrl) {
                    updatePayload.cover_image_url = mediaUrl;
                    updatePayload.file_path = mediaPath;
                }

                if (status === 'published') {
                    updatePayload.published_at =
                        new Date().toISOString();
                }

                const { error } = await db
                    .from('content_items')
                    .update(updatePayload)
                    .eq('id', editingId);

                if (error) throw error;

                alert(
                    status === 'published'
                        ? 'İçerik güncellendi ve yayınlandı.'
                        : 'İçerik güncellendi ve taslak olarak kaydedildi.'
                );

            }

            // -------------------------------------------------
            // YENİ İÇERİK OLUŞTUR
            // -------------------------------------------------

            else {

                const insertPayload = {
                    ...payload,
                    cover_image_url: mediaUrl,
                    file_path: mediaPath,
                    published_at:
                        status === 'published'
                            ? new Date().toISOString()
                            : null
                };

                const { error } = await db
                    .from('content_items')
                    .insert([insertPayload]);

                if (error) throw error;

                alert(
                    status === 'published'
                        ? 'İçerik başarıyla yayınlandı!'
                        : 'İçerik başarıyla taslak olarak kaydedildi!'
                );
            }

            clearForm();

            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            console.error(error);

            alert(
                'Kayıt sırasında hata oluştu:\n\n' +
                error.message
            );

        } finally {

            setButtonsDisabled(false);
        }
    }

    // ---------------------------------------------------------
    // İÇERİĞİ DÜZENLE
    // ---------------------------------------------------------

    async function editContent(id) {

        try {

            const { data, error } = await db
                .from('content_items')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            editingId = data.id;

            if (editingIdInput) {
                editingIdInput.value = data.id;
            }

            if (titleInput) {
                titleInput.value = data.title || '';
            }

            if (descriptionInput) {
                descriptionInput.value =
                    data.body ||
                    data.summary ||
                    '';
            }

            if (typeSelect) {
                typeSelect.value =
                    data.type || 'story';
            }

            if (langSelect) {
                langSelect.value =
                    data.language || 'tr';
            }

            if (tagsInput) {
                tagsInput.value =
                    Array.isArray(data.tags)
                        ? data.tags.join(', ')
                        : '';
            }

            const categorySelect =
                document.getElementById(
                    'contentCategory'
                );

            if (categorySelect) {
                categorySelect.value =
                    data.category_id || '';
            }

            if (btnPublish) {
                btnPublish.textContent =
                    'Güncelle & Yayınla';
            }

            if (btnSaveDraft) {
                btnSaveDraft.textContent =
                    'Güncelle & Taslak Kaydet';
            }

            const heading =
                document.getElementById(
                    'contentFormTitle'
                );

            if (heading) {
                heading.textContent =
                    'İçeriği Düzenle';
            }

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        } catch (error) {

            alert(
                'İçerik açılırken hata oluştu:\n\n' +
                error.message
            );
        }
    }

    // ---------------------------------------------------------
    // ARŞİVLE
    // ---------------------------------------------------------

    async function archiveContent(id) {

        const confirmed = confirm(
            'Bu içerik arşive taşınacak.\n\n' +
            'Devam etmek istiyor musunuz?'
        );

        if (!confirmed) return;

        try {

            const { error } = await db
                .from('content_items')
                .update({
                    status: 'archived',
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            alert(
                'İçerik arşive taşındı.'
            );

            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            alert(
                'Arşivleme sırasında hata oluştu:\n\n' +
                error.message
            );
        }
    }

    // ---------------------------------------------------------
    // ARŞİVDEN GERİ YÜKLE
    // ---------------------------------------------------------

    async function restoreContent(id) {

        try {

            const { error } = await db
                .from('content_items')
                .update({
                    status: 'draft',
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            alert(
                'İçerik taslak olarak geri yüklendi.'
            );

            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            alert(
                'Geri yükleme sırasında hata oluştu:\n\n' +
                error.message
            );
        }
    }

    // ---------------------------------------------------------
    // STORAGE DOSYA YOLUNU BUL
    // ---------------------------------------------------------

    function getStoragePath(item) {

        if (item.file_path) {
            return item.file_path;
        }

        if (!item.cover_image_url) {
            return null;
        }

        try {

            const marker =
                '/storage/v1/object/public/echoes-media/';

            const index =
                item.cover_image_url.indexOf(marker);

            if (index === -1) {
                return null;
            }

            return decodeURIComponent(
                item.cover_image_url.substring(
                    index + marker.length
                )
            );

        } catch {
            return null;
        }
    }

    // ---------------------------------------------------------
    // KALICI SİL
    // ---------------------------------------------------------

    async function permanentlyDeleteContent(id) {

        const confirmed = confirm(
            'DİKKAT!\n\n' +
            'Bu içerik kalıcı olarak silinecek.\n' +
            'Arşiv kaydı ve bağlı medya dosyası kaldırılacak.\n\n' +
            'Bu işlem geri alınamaz.\n\n' +
            'Devam etmek istiyor musunuz?'
        );

        if (!confirmed) return;

        try {

            const {
                data: item,
                error: fetchError
            } = await db
                .from('content_items')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Önce Storage'daki medya dosyasını sil
            const storagePath =
                getStoragePath(item);

            if (storagePath) {

                const {
                    error: storageError
                } = await db
                    .storage
                    .from('echoes-media')
                    .remove([storagePath]);

                if (storageError) {
                    throw new Error(
                        'Medya dosyası silinemedi: ' +
                        storageError.message
                    );
                }
            }

            // Sonra database kaydını sil
            const {
                error: deleteError
            } = await db
                .from('content_items')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw deleteError;
            }

            alert(
                'İçerik ve bağlı medya dosyası ' +
                'kalıcı olarak silindi.'
            );

            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            alert(
                'Silme sırasında hata oluştu:\n\n' +
                error.message
            );
        }
                          }

        // ---------------------------------------------------------
    // DASHBOARD
    // ---------------------------------------------------------

    async function loadDashboard() {

        let dashboard =
            document.getElementById('adminDashboard');

        if (!dashboard) {

            dashboard = document.createElement('section');

            dashboard.id = 'adminDashboard';

            dashboard.style.cssText =
                'margin-bottom:25px;';

            const container =
                document.querySelector('.container');

            if (container) {

                const header =
                    container.querySelector('.header');

                if (header) {
                    header.insertAdjacentElement(
                        'afterend',
                        dashboard
                    );
                }
            }
        }

        try {

            const { data, error } = await db
                .from('content_items')
                .select(
                    'id,status,type,language,category_id'
                );

            if (error) throw error;

            const items = data || [];

            const total = items.length;

            const drafts =
                items.filter(
                    i => i.status === 'draft'
                ).length;

            const review =
                items.filter(
                    i => i.status === 'review'
                ).length;

            const published =
                items.filter(
                    i => i.status === 'published'
                ).length;

            const archived =
                items.filter(
                    i => i.status === 'archived'
                ).length;

            dashboard.innerHTML = `

                <div style="
                    display:grid;
                    grid-template-columns:
                        repeat(auto-fit,minmax(140px,1fr));
                    gap:12px;
                    margin-top:20px;
                ">

                    <div style="
                        padding:18px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    ">
                        <div style="
                            font-size:13px;
                            color:#94a3b8;
                        ">
                            TOPLAM
                        </div>

                        <strong style="
                            font-size:28px;
                        ">
                            ${total}
                        </strong>
                    </div>

                    <div style="
                        padding:18px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    ">
                        <div style="
                            font-size:13px;
                            color:#94a3b8;
                        ">
                            TASLAK
                        </div>

                        <strong style="
                            font-size:28px;
                        ">
                            ${drafts}
                        </strong>
                    </div>

                    <div style="
                        padding:18px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    ">
                        <div style="
                            font-size:13px;
                            color:#94a3b8;
                        ">
                            İNCELEME
                        </div>

                        <strong style="
                            font-size:28px;
                        ">
                            ${review}
                        </strong>
                    </div>

                    <div style="
                        padding:18px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    ">
                        <div style="
                            font-size:13px;
                            color:#94a3b8;
                        ">
                            YAYINDA
                        </div>

                        <strong style="
                            font-size:28px;
                        ">
                            ${published}
                        </strong>
                    </div>

                    <div style="
                        padding:18px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    ">
                        <div style="
                            font-size:13px;
                            color:#94a3b8;
                        ">
                            ARŞİV
                        </div>

                        <strong style="
                            font-size:28px;
                        ">
                            ${archived}
                        </strong>
                    </div>

                </div>
            `;

        } catch (error) {

            console.error(
                'Dashboard yükleme hatası:',
                error
            );
        }
    }

    // ---------------------------------------------------------
    // KÜTÜPHANE
    // ---------------------------------------------------------

   async function loadLibrary() {
    if (!libraryList) return;

    // Aynı anda birden fazla kütüphane sorgusunun
    // üst üste binmesini engelle.
    if (libraryLoading) return;

    libraryLoading = true;
    const requestId = ++libraryRequestId;

    libraryList.innerHTML = `
        <p style="color:#94a3b8;">
            İçerikler yükleniyor…
        </p>
    `;

    try {
        const { data, error } = await db
            .from('content_items')
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug
                )
            `)
            .order('created_at', { ascending: false });

        // Bu istek artık güncel değilse DOM'a dokunma.
        if (requestId !== libraryRequestId) return;

        if (error) throw error;

        if (!data || data.length === 0) {
            libraryList.innerHTML = `
                <p style="color:#94a3b8;">
                    Henüz kayıtlı içerik bulunmuyor.
                </p>
            `;
            return;
        }

        libraryList.innerHTML = data.map(item => {

            const categoryName =
                item.categories?.name || 'Kategorisiz';

            const isArchived =
                item.status === 'archived';

            const isPublished =
                item.status === 'published';

            const media =
                item.cover_image_url
                    ? `
                        <a
                            href="${escapeHtml(item.cover_image_url)}"
                            target="_blank"
                            rel="noopener"
                        >
                            Medyayı Aç
                        </a>
                    `
                    : 'Medya yok';

            return `
                <article
                    style="
                        border:1px solid #334155;
                        padding:16px;
                        margin-bottom:12px;
                        border-radius:10px;
                        background:#0f172a;
                    "
                >

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:10px;
                            align-items:flex-start;
                            flex-wrap:wrap;
                        "
                    >

                        <div style="flex:1;">

                            <strong style="font-size:18px;">
                                ${escapeHtml(item.title)}
                            </strong>

                            <div
                                style="
                                    margin-top:7px;
                                    font-size:13px;
                                    color:#94a3b8;
                                "
                            >
                                ${statusLabel(item.status)}
                                ·
                                ${typeLabel(item.type)}
                                ·
                                ${escapeHtml(
                                    String(item.language || '')
                                        .toUpperCase()
                                )}
                                ·
                                ${escapeHtml(categoryName)}
                            </div>

                        </div>

                    </div>

                    <p
                        style="
                            color:#cbd5e1;
                            margin:12px 0;
                        "
                    >
                        ${escapeHtml(item.summary || '')}
                    </p>

                    <div
                        style="
                            font-size:12px;
                            color:#64748b;
                            margin-bottom:12px;
                        "
                    >
                        Oluşturulma:
                        ${formatDate(item.created_at)}
                    </div>

                    <div
                        style="
                            margin-bottom:12px;
                        "
                    >
                        ${media}
                    </div>

                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                        "
                    >

                        <button
                            data-action="edit"
                            data-id="${escapeHtml(item.id)}"
                        >
                            Düzenle
                        </button>

                        ${
                            isArchived
                                ? `
                                    <button
                                        data-action="restore"
                                        data-id="${escapeHtml(item.id)}"
                                    >
                                        Geri Yükle
                                    </button>

                                    <button
                                        data-action="delete"
                                        data-id="${escapeHtml(item.id)}"
                                        style="
                                            background:#7f1d1d;
                                            color:white;
                                        "
                                    >
                                        Kalıcı Sil
                                    </button>
                                `
                                : `
                                    ${
                                        !isPublished
                                            ? `
                                                <button
                                                    data-action="publish"
                                                    data-id="${escapeHtml(item.id)}"
                                                >
                                                    Yayınla
                                                </button>
                                            `
                                            : ''
                                    }

                                    <button
                                        data-action="archive"
                                        data-id="${escapeHtml(item.id)}"
                                    >
                                        Arşivle
                                    </button>
                                `
                        }

                    </div>

                </article>
            `;
        }).join('');

    } catch (error) {

        console.error('Kütüphane yükleme hatası:', error);

        if (requestId !== libraryRequestId) return;

        libraryList.innerHTML = `
            <p style="color:#f87171;">
                Kütüphane yüklenirken hata oluştu:
                ${escapeHtml(error.message)}
            </p>
        `;

    } finally {

        // Yalnızca hâlâ geçerli olan istek loading kilidini kaldırır.
        if (requestId === libraryRequestId) {
            libraryLoading = false;
        }
    }
   } 


    // ---------------------------------------------------------
    // YAYINLA
    // ---------------------------------------------------------

    async function publishContent(id) {

        try {

            const { error } = await db
                .from('content_items')
                .update({
                    status: 'published',
                    published_at:
                        new Date().toISOString(),
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            alert('İçerik yayınlandı.');

            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            alert(
                'Yayınlama sırasında hata oluştu:\n\n' +
                error.message
            );
        }
    }

    // ---------------------------------------------------------
    // KÜTÜPHANE BUTONLARI
    // ---------------------------------------------------------

    if (libraryList) {

        libraryList.addEventListener(
            'click',
            event => {

                const button =
                    event.target.closest(
                        'button[data-action]'
                    );

                if (!button) return;

                const action =
                    button.dataset.action;

                const id =
                    button.dataset.id;

                if (!id) return;

                if (action === 'edit') {
                    editContent(id);
                }

                if (action === 'publish') {
                    publishContent(id);
                }

                if (action === 'archive') {
                    archiveContent(id);
                }

                if (action === 'restore') {
                    restoreContent(id);
                }

                if (action === 'delete') {
                    permanentlyDeleteContent(id);
                }
            }
        );
    }

    // ---------------------------------------------------------
    // NAVIGATION
    // ---------------------------------------------------------

    const navButtons =
        document.querySelector('.nav-btns');

    if (navButtons) {

        let dashboardButton =
            document.getElementById('navDashboard');

        if (!dashboardButton) {

            dashboardButton =
                document.createElement('button');

            dashboardButton.id =
                'navDashboard';

            dashboardButton.textContent =
                'Dashboard';

            navButtons.insertBefore(
                dashboardButton,
                navButtons.firstChild
            );
        }

        dashboardButton.addEventListener(
            'click',
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        );

        const navNewContent =
            document.getElementById(
                'navNewContent'
            );

        if (navNewContent) {

            navNewContent.addEventListener(
                'click',
                () => {

                    clearForm();

                    const form =
                        document.getElementById(
                            'contentForm'
                        );

                    if (form) {
                        form.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            );
        }

        const navLibrary =
            document.getElementById(
                'navLibrary'
            );

        if (navLibrary) {

            navLibrary.addEventListener(
                'click',
                async () => {

                    const library =
                        document.getElementById(
                            'librarySection'
                        );

                    if (library) {

                        library.style.display =
                            'block';

                        library.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }

                    await loadLibrary();
                }
            );
        }
    }
// ---------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------

async function loadSettings() {

    const adminEmail =
        document.getElementById('settingsAdminEmail');

    const accountStatus =
        document.getElementById('settingsAccountStatus');

    const databaseStatus =
        document.getElementById('settingsDatabaseStatus');

    const storageStatus =
        document.getElementById('settingsStorageStatus');

    try {

        // ---------------------------------------------
        // YÖNETİCİ HESABI
        // ---------------------------------------------

        const {
            data: userData,
            error: userError
        } = await db.auth.getUser();

        if (userError) {
            throw userError;
        }

        const user =
            userData &&
            userData.user
                ? userData.user
                : null;

        if (adminEmail) {
            adminEmail.textContent =
                user && user.email
                    ? user.email
                    : '-';
        }

        if (accountStatus) {
            accountStatus.textContent =
                user
                    ? 'Aktif'
                    : 'Oturum bulunamadı';
        }


        // ---------------------------------------------
        // DATABASE DURUMU
        // ---------------------------------------------

        const {
            error: databaseError
        } = await db
            .from('content_items')
            .select('id', {
                count: 'exact',
                head: true
            });

        if (databaseError) {
            throw databaseError;
        }

        if (databaseStatus) {
            databaseStatus.textContent =
                'Bağlı';
        }


        // ---------------------------------------------
        // STORAGE DURUMU
        // ---------------------------------------------

        const {
            error: storageError
        } = await db
            .storage
            .from('echoes-media')
            .list('', {
                limit: 1
            });

        if (storageError) {
            throw storageError;
        }

        if (storageStatus) {
            storageStatus.textContent =
                'Bağlı';
        }

    } catch (error) {

        console.error(
            'Settings yükleme hatası:',
            error
        );

        if (databaseStatus) {
            databaseStatus.textContent =
                'Kontrol edilemedi';
        }

        if (storageStatus) {
            storageStatus.textContent =
                'Kontrol edilemedi';
        }

        if (accountStatus) {
            accountStatus.textContent =
                'Kontrol edilemedi';
        }
    }
}


// ---------------------------------------------------------
// SETTINGS NAVIGATION
// ---------------------------------------------------------

const navSettings =
    document.getElementById('navSettings');

if (navSettings) {

    navSettings.addEventListener(
        'click',
        async () => {

            const settingsSection =
                document.getElementById(
                    'settingsSection'
                );

            if (!settingsSection) {
                return;
            }

            settingsSection.style.display =
                'block';

            settingsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            await loadSettings();
        }
    );
}


// ---------------------------------------------------------
// SETTINGS REFRESH
// ---------------------------------------------------------

const btnSettingsRefresh =
    document.getElementById(
        'btnSettingsRefresh'
    );

if (btnSettingsRefresh) {

    btnSettingsRefresh.addEventListener(
        'click',
        async () => {

            btnSettingsRefresh.disabled =
                true;

            try {

                await loadSettings();

            } finally {

                btnSettingsRefresh.disabled =
                    false;
            }
        }
    );
}


// ---------------------------------------------------------
// SETTINGS LOGOUT
// ---------------------------------------------------------

const btnSettingsLogout =
    document.getElementById(
        'btnSettingsLogout'
    );

if (btnSettingsLogout) {

    btnSettingsLogout.addEventListener(
        'click',
        async () => {

            const confirmed =
                confirm(
                    'Oturumu kapatmak istediğinizden emin misiniz?'
                );

            if (!confirmed) {
                return;
            }

            try {

                const {
                    error
                } = await db.auth.signOut();

                if (error) {
                    throw error;
                }

                window.location.href =
                    'login.html';

            } catch (error) {

                console.error(
                    'Çıkış hatası:',
                    error
                );

                alert(
                    'Çıkış sırasında hata oluştu:\n\n' +
                    error.message
                );
            }
        }
    );
                }

    // ---------------------------------------------------------
// KATEGORİ YÖNETİMİ — BÖLÜM 1
// ---------------------------------------------------------

function getCategoryChildren(parentId) {

    return categories.filter(
        category => category.parent_id === parentId
    );
}


function buildCategoryOptions(selectedId = '') {

    let html =
        '<option value="">Ana kategori</option>';

    const parents =
        categories.filter(
            category => !category.parent_id
        );

    parents.forEach(parent => {

        html += `
            <option
                value="${escapeHtml(parent.id)}"
                ${parent.id === selectedId ? 'selected' : ''}
            >
                ${escapeHtml(parent.name)}
            </option>
        `;

        const children =
            getCategoryChildren(parent.id);

        children.forEach(child => {

            html += `
                <option
                    value="${escapeHtml(child.id)}"
                    ${child.id === selectedId ? 'selected' : ''}
                >
                    └ ${escapeHtml(child.name)}
                </option>
            `;
        });
    });

    return html;
}


function renderCategoryManager() {

    const container =
        document.getElementById(
            'categoryManagerList'
        );

    if (!container) {
        return;
    }

    if (!categories.length) {

        container.innerHTML = `
            <p style="color:#94a3b8;">
                Henüz kategori bulunmuyor.
            </p>
        `;

        return;
    }

    const parents =
        categories.filter(
            category => !category.parent_id
        );

    const rows = [];

    parents.forEach(parent => {

        rows.push(`
            <div
                class="category-manager-row"
                data-category-id="${escapeHtml(parent.id)}"
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:12px;
                    padding:12px;
                    margin-bottom:8px;
                    border:1px solid #334155;
                    border-radius:8px;
                    background:#0f172a;
                "
            >

                <div style="min-width:0;">

                    <strong>
                        ${escapeHtml(parent.name)}
                    </strong>

                    <div
                        style="
                            color:#64748b;
                            font-size:12px;
                            margin-top:4px;
                        "
                    >
                        /${escapeHtml(parent.slug)}
                        · Ana kategori
                    </div>

                </div>

                <div
                    style="
                        display:flex;
                        gap:6px;
                        flex-shrink:0;
                    "
                >

                    <button
                        type="button"
                        data-category-action="edit"
                        data-category-id="${escapeHtml(parent.id)}"
                    >
                        Düzenle
                    </button>

                    <button
                        type="button"
                        data-category-action="delete"
                        data-category-id="${escapeHtml(parent.id)}"
                        style="
                            background:#7f1d1d;
                            color:white;
                        "
                    >
                        Sil
                    </button>

                </div>

            </div>
        `);

        const children =
            getCategoryChildren(parent.id);

        children.forEach(child => {

            rows.push(`
                <div
                    class="category-manager-row"
                    data-category-id="${escapeHtml(child.id)}"
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        padding:12px;
                        margin-bottom:8px;
                        margin-left:20px;
                        border-left:3px solid #334155;
                        border-top:1px solid #334155;
                        border-right:1px solid #334155;
                        border-bottom:1px solid #334155;
                        border-radius:8px;
                        background:#0f172a;
                    "
                >

                    <div style="min-width:0;">

                        <strong>
                            └ ${escapeHtml(child.name)}
                        </strong>

                        <div
                            style="
                                color:#64748b;
                                font-size:12px;
                                margin-top:4px;
                            "
                        >
                            /${escapeHtml(child.slug)}
                        </div>

                    </div>

                    <div
                        style="
                            display:flex;
                            gap:6px;
                            flex-shrink:0;
                        "
                    >

                        <button
                            type="button"
                            data-category-action="edit"
                            data-category-id="${escapeHtml(child.id)}"
                        >
                            Düzenle
                        </button>

                        <button
                            type="button"
                            data-category-action="delete"
                            data-category-id="${escapeHtml(child.id)}"
                            style="
                                background:#7f1d1d;
                                color:white;
                            "
                        >
                            Sil
                        </button>

                    </div>

                </div>
            `);
        });
    });

    container.innerHTML = rows.join('');
}

    // ---------------------------------------------------------
// KATEGORİ YÖNETİMİ — BÖLÜM 2
// ---------------------------------------------------------

function openCategoryManager() {

    let modal =
        document.getElementById(
            'categoryManagerModal'
        );

    if (!modal) {

        modal =
            document.createElement('div');

        modal.id =
            'categoryManagerModal';

        modal.style.cssText = `
            position:fixed;
            inset:0;
            z-index:9999;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.75);
        `;

        modal.innerHTML = `
            <div
                style="
                    width:min(700px,100%);
                    max-height:90vh;
                    overflow:auto;
                    padding:22px;
                    border:1px solid #334155;
                    border-radius:12px;
                    background:#020617;
                    color:white;
                    box-shadow:0 20px 60px rgba(0,0,0,.5);
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        margin-bottom:20px;
                    "
                >

                    <h2 style="margin:0;">
                        Kategori Yönetimi
                    </h2>

                    <button
                        type="button"
                        id="closeCategoryManager"
                    >
                        ✕
                    </button>

                </div>


                <div
                    style="
                        padding:16px;
                        margin-bottom:20px;
                        border:1px solid #334155;
                        border-radius:10px;
                        background:#0f172a;
                    "
                >

                    <h3
                        id="categoryFormTitle"
                        style="margin-top:0;"
                    >
                        Yeni Kategori
                    </h3>

                    <input
                        type="hidden"
                        id="categoryEditingId"
                        value=""
                    >

                    <label>
                        Kategori adı
                    </label>

                    <input
                        type="text"
                        id="categoryNameInput"
                        placeholder="Kategori adı"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 12px;
                            padding:10px;
                        "
                    >

                    <label>
                        Slug
                    </label>

                    <input
                        type="text"
                        id="categorySlugInput"
                        placeholder="kategori-slug"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 12px;
                            padding:10px;
                        "
                    >

                    <label>
                        Üst kategori
                    </label>

                    <select
                        id="categoryParentInput"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 14px;
                            padding:10px;
                        "
                    ></select>

                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                        "
                    >

                        <button
                            type="button"
                            id="saveCategoryButton"
                        >
                            Kategoriyi Kaydet
                        </button>

                        <button
                            type="button"
                            id="cancelCategoryEdit"
                            style="display:none;"
                        >
                            Düzenlemeyi İptal Et
                        </button>

                    </div>

                </div>


                <h3>
                    Mevcut Kategoriler
                </h3>

                <div id="categoryManagerList">
                    Kategoriler yükleniyor...
                </div>

            </div>
        `;

        document.body.appendChild(modal);


        const closeButton =
            document.getElementById(
                'closeCategoryManager'
            );

        if (closeButton) {

            closeButton.addEventListener(
                'click',
                closeCategoryManager
            );
        }


        const cancelButton =
            document.getElementById(
                'cancelCategoryEdit'
            );

        if (cancelButton) {

            cancelButton.addEventListener(
                'click',
                resetCategoryForm
            );
        }


        const nameInput =
            document.getElementById(
                'categoryNameInput'
            );

        const slugInput =
            document.getElementById(
                'categorySlugInput'
            );

        if (nameInput && slugInput) {

            nameInput.addEventListener(
                'input',
                () => {

                    const editingId =
                        document.getElementById(
                            'categoryEditingId'
                        )?.value;

                    if (!editingId) {

                        slugInput.value =
                            createSlug(
                                nameInput.value
                            );
                    }
                }
            );
        }


        const saveButton =
            document.getElementById(
                'saveCategoryButton'
            );

        if (saveButton) {

            saveButton.addEventListener(
                'click',
                saveCategory
            );
        }


        const list =
            document.getElementById(
                'categoryManagerList'
            );

        if (list) {

            list.addEventListener(
                'click',
                event => {

                    const button =
                        event.target.closest(
                            '[data-category-action]'
                        );

                    if (!button) {
                        return;
                    }

                    const action =
                        button.dataset.categoryAction;

                    const id =
                        button.dataset.categoryId;

                    if (!id) {
                        return;
                    }

                    if (action === 'edit') {
                        editCategory(id);
                    }

                    if (action === 'delete') {
                        deleteCategory(id);
                    }
                }
            );
        }
    }

    modal.style.display =
        'flex';

    resetCategoryForm();

    renderCategoryManager();
}


function closeCategoryManager() {

    const modal =
        document.getElementById(
            'categoryManagerModal'
        );

    if (modal) {

        modal.style.display =
            'none';
    }
}


function resetCategoryForm() {

    const editingId =
        document.getElementById(
            'categoryEditingId'
        );

    const nameInput =
        document.getElementById(
            'categoryNameInput'
        );

    const slugInput =
        document.getElementById(
            'categorySlugInput'
        );

    const parentInput =
        document.getElementById(
            'categoryParentInput'
        );

    const title =
        document.getElementById(
            'categoryFormTitle'
        );

    const cancelButton =
        document.getElementById(
            'cancelCategoryEdit'
        );

    if (editingId) {
        editingId.value = '';
    }

    if (nameInput) {
        nameInput.value = '';
    }

    if (slugInput) {
        slugInput.value = '';
    }

    if (parentInput) {

        parentInput.innerHTML =
            buildCategoryOptions();

        parentInput.value = '';
    }

    if (title) {

        title.textContent =
            'Yeni Kategori';
    }

    if (cancelButton) {

        cancelButton.style.display =
            'none';
    }
}


function editCategory(id) {

    const category =
        categories.find(
            item => item.id === id
        );

    if (!category) {
        return;
    }

    const editingId =
        document.getElementById(
            'categoryEditingId'
        );

    const nameInput =
        document.getElementById(
            'categoryNameInput'
        );

    const slugInput =
        document.getElementById(
            'categorySlugInput'
        );

    const parentInput =
        document.getElementById(
            'categoryParentInput'
        );

    const title =
        document.getElementById(
            'categoryFormTitle'
        );

    const cancelButton =
        document.getElementById(
            'cancelCategoryEdit'
        );

    if (editingId) {

        editingId.value =
            category.id;
    }

    if (nameInput) {

        nameInput.value =
            category.name || '';
    }

    if (slugInput) {

        slugInput.value =
            category.slug || '';
    }

    if (parentInput) {

        parentInput.innerHTML =
            buildCategoryOptions(
                category.parent_id || ''
            );

        const ownOption =
            parentInput.querySelector(
                `option[value="${CSS.escape(category.id)}"]`
            );

        if (ownOption) {
            ownOption.remove();
        }
    }

    if (title) {

        title.textContent =
            'Kategori Düzenle';
    }

    if (cancelButton) {

        cancelButton.style.display =
            'inline-block';
    }
        }

    // ---------------------------------------------------------
// KATEGORİ YÖNETİMİ — BÖLÜM 3
// ---------------------------------------------------------

async function saveCategory() {

    const editingId =
        document.getElementById(
            'categoryEditingId'
        )?.value || '';

    const nameInput =
        document.getElementById(
            'categoryNameInput'
        );

    const slugInput =
        document.getElementById(
            'categorySlugInput'
        );

    const parentInput =
        document.getElementById(
            'categoryParentInput'
        );

    const saveButton =
        document.getElementById(
            'saveCategoryButton'
        );

    const name =
        nameInput
            ? nameInput.value.trim()
            : '';

    const slug =
        slugInput
            ? slugInput.value.trim() ||
              createSlug(name)
            : '';

    const parentId =
        parentInput
            ? parentInput.value || null
            : null;


    if (!name) {

        alert(
            'Lütfen kategori adını girin.'
        );

        return;
    }


    if (!slug) {

        alert(
            'Lütfen kategori slug değerini girin.'
        );

        return;
    }


    if (
        editingId &&
        parentId === editingId
    ) {

        alert(
            'Bir kategori kendisinin üst kategorisi olamaz.'
        );

        return;
    }


    if (saveButton) {
        saveButton.disabled = true;
    }


    try {

        if (editingId) {

            const {
                error
            } = await db
                .from('categories')
                .update({
                    name: name,
                    slug: slug,
                    parent_id: parentId,
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', editingId);

            if (error) {
                throw error;
            }

            alert(
                'Kategori başarıyla güncellendi.'
            );

        } else {

            const {
                error
            } = await db
                .from('categories')
                .insert([{
                    name: name,
                    slug: slug,
                    parent_id: parentId
                }]);

            if (error) {
                throw error;
            }

            alert(
                'Kategori başarıyla oluşturuldu.'
            );
        }


        await loadCategories();

        resetCategoryForm();

        renderCategoryManager();


    } catch (error) {

        console.error(
            'Kategori kaydetme hatası:',
            error
        );

        alert(
            'Kategori kaydedilirken hata oluştu:\n\n' +
            error.message
        );


    } finally {

        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}


async function deleteCategory(id) {

    const category =
        categories.find(
            item => item.id === id
        );

    if (!category) {
        return;
    }


    // ---------------------------------------------
    // İÇERİK KULLANIM KONTROLÜ
    // ---------------------------------------------

    const {
        count: contentCount,
        error: contentError
    } = await db
        .from('content_items')
        .select('id', {
            count: 'exact',
            head: true
        })
        .eq('category_id', id);


    if (contentError) {

        alert(
            'Kategori kullanım durumu kontrol edilemedi:\n\n' +
            contentError.message
        );

        return;
    }


    // ---------------------------------------------
    // ALT KATEGORİ KONTROLÜ
    // ---------------------------------------------

    const {
        count: childCount,
        error: childError
    } = await db
        .from('categories')
        .select('id', {
            count: 'exact',
            head: true
        })
        .eq('parent_id', id);


    if (childError) {

        alert(
            'Alt kategori kontrol edilemedi:\n\n' +
            childError.message
        );

        return;
    }


    if (contentCount > 0) {

        alert(
            'Bu kategori silinemez.\n\n' +
            'Bu kategoriye bağlı ' +
            contentCount +
            ' içerik bulunuyor.\n\n' +
            'Önce bu içerikleri başka bir kategoriye taşımalısınız.'
        );

        return;
    }


    if (childCount > 0) {

        alert(
            'Bu kategori silinemez.\n\n' +
            'Bu kategoriye bağlı alt kategoriler bulunuyor.\n\n' +
            'Önce alt kategorileri taşımalı veya silmelisiniz.'
        );

        return;
    }


    const confirmed =
        confirm(
            '"' +
            category.name +
            '" kategorisi kalıcı olarak silinecek.\n\n' +
            'Devam etmek istiyor musunuz?'
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await db
            .from('categories')
            .delete()
            .eq('id', id);


        if (error) {
            throw error;
        }


        alert(
            'Kategori kalıcı olarak silindi.'
        );


        await loadCategories();

        renderCategoryManager();


    } catch (error) {

        console.error(
            'Kategori silme hatası:',
            error
        );

        alert(
            'Kategori silinirken hata oluştu:\n\n' +
            error.message
        );
    }
}


// ---------------------------------------------------------
// KATEGORİ YÖNETİMİ BUTONU
// ---------------------------------------------------------

const btnManageCategories =
    document.getElementById(
        'btnManageCategories'
    );


if (btnManageCategories) {

    btnManageCategories.addEventListener(
        'click',
        openCategoryManager
    );
}
    // ---------------------------------------------------------
    // FORM BUTONLARI
    // ---------------------------------------------------------

    if (btnPublish) {

        btnPublish.addEventListener(
            'click',
            () => saveForm('published')
        );
    }

    if (btnSaveDraft) {

        btnSaveDraft.addEventListener(
            'click',
            () => saveForm('draft')
        );
    }

    if (btnClear) {

        btnClear.addEventListener(
            'click',
            clearForm
        );
    }

    if (btnRefresh) {

        btnRefresh.addEventListener(
            'click',
            async () => {

                await loadDashboard();
                await loadLibrary();
            }
        );
    }

    // ---------------------------------------------------------
    // BAŞLANGIÇ
    // ---------------------------------------------------------

    async function initializeAdmin() {
        try {

                    const roleDebug = document.createElement('div');
        roleDebug.textContent = 'ROL TESTİ: JS ÇALIŞIYOR';
        roleDebug.style.marginTop = '8px';
        roleDebug.style.color = '#facc15';
        roleDebug.style.fontSize = '12px';
        roleDebug.style.fontWeight = '600';

        const debugBrand = document.querySelector('.brand');
        if (debugBrand) {
            debugBrand.appendChild(roleDebug);
        }

        await loadAdminRole();
                    roleDebug.textContent =
            'ROL TESTİ: ' +
            (window.adminRole?.name || 'ROL BULUNAMADI');
await loadAdminPermissions();

await loadCategories();
            await loadDashboard();
            await loadLibrary();

        } catch (error) {

            console.error(
                'Admin panel başlatma hatası:',
                error
            );
        }
    }

    initializeAdmin();

});
