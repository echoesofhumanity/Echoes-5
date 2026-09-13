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

        libraryList.innerHTML =
            '<p>İçerikler yükleniyor...</p>';

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
                .order(
                    'created_at',
                    { ascending: false }
                );

            if (error) throw error;

            if (!data || data.length === 0) {

                libraryList.innerHTML =
                    '<p>Henüz kayıtlı içerik bulunmuyor.</p>';

                return;
            }

            libraryList.innerHTML =
                data.map(item => {

                    const categoryName =
                        item.categories?.name ||
                        'Kategorisiz';

                    const isArchived =
                        item.status === 'archived';

                    const isPublished =
                        item.status === 'published';

                    const media =
                        item.cover_image_url
                            ? `
                                <a
                                    href="${escapeHtml(
                                        item.cover_image_url
                                    )}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Medyayı Aç
                                </a>
                              `
                            : 'Medya yok';

                    return `

                        <article style="
                            border:1px solid #334155;
                            padding:16px;
                            margin-bottom:12px;
                            border-radius:10px;
                            background:#0f172a;
                        ">

                            <div style="
                                display:flex;
                                justify-content:
                                    space-between;
                                gap:10px;
                                align-items:
                                    flex-start;
                                flex-wrap:wrap;
                            ">

                                <div style="flex:1;">

                                    <strong style="
                                        font-size:18px;
                                    ">
                                        ${escapeHtml(
                                            item.title
                                        )}
                                    </strong>

                                    <div style="
                                        margin-top:7px;
                                        font-size:13px;
                                        color:#94a3b8;
                                    ">
                                        ${statusLabel(
                                            item.status
                                        )}
                                        ·
                                        ${typeLabel(
                                            item.type
                                        )}
                                        ·
                                        ${escapeHtml(
                                            String(
                                                item.language || ''
                                            ).toUpperCase()
                                        )}
                                        ·
                                        ${escapeHtml(
                                            categoryName
                                        )}
                                    </div>

                                </div>

                            </div>

                            <p style="
                                color:#cbd5e1;
                                margin:12px 0;
                            ">
                                ${escapeHtml(
                                    item.summary || ''
                                )}
                            </p>

                            <div style="
                                font-size:12px;
                                color:#64748b;
                                margin-bottom:12px;
                            ">
                                Oluşturulma:
                                ${formatDate(
                                    item.created_at
                                )}
                            </div>

                            <div style="
                                margin-bottom:12px;
                            ">
                                ${media}
                            </div>

                            <div style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                            ">

                                <button
                                    data-action="edit"
                                    data-id="${item.id}"
                                >
                                    Düzenle
                                </button>

                                ${
                                    isArchived
                                        ? `
                                            <button
                                                data-action="restore"
                                                data-id="${item.id}"
                                            >
                                                Geri Yükle
                                            </button>

                                            <button
                                                data-action="delete"
                                                data-id="${item.id}"
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
                                                            data-id="${item.id}"
                                                        >
                                                            Yayınla
                                                        </button>
                                                      `
                                                    : ''
                                            }

                                            <button
                                                data-action="archive"
                                                data-id="${item.id}"
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

            console.error(error);

            libraryList.innerHTML = `
                <p style="color:#f87171;">
                    Kütüphane yüklenirken hata:
                    ${escapeHtml(error.message)}
                </p>
            `;
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
