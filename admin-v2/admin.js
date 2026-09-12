document.addEventListener('DOMContentLoaded', () => {
    // Form Butonları
    const btnPublish = document.getElementById('btnPublish');
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    const btnClear = document.getElementById('btnClear');
    const btnRefresh = document.getElementById('btnRefresh');

    // Form Elemanları
    const typeSelect = document.getElementById('contentType');
    const langSelect = document.getElementById('contentLanguage');
    const categoryInput = document.getElementById('contentCategory');
    const descriptionInput = document.getElementById('contentDescription');
    const tagsInput = document.getElementById('contentTags');
    const fileInput = document.getElementById('contentFile');
    const libraryList = document.getElementById('libraryList');

    // 1. Formu Supabase'e Kaydetme Fonksiyonu
    async function saveForm(status) {
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        if (!description) {
            alert('Lütfen içerik / açıklama alanını doldurun.');
            return;
        }

        try {
            if (btnPublish) btnPublish.disabled = true;
            if (btnSaveDraft) btnSaveDraft.disabled = true;

            let fileUrl = null;
            // Dosya seçildiyse önce Storage Bucket'a yüklüyoruz
            if (fileInput && fileInput.files[0]) {
                fileUrl = await uploadMediaFile(fileInput.files[0]);
            }

            // Veritabanına kaydedilecek veri paketi
            const payload = {
                title: description.substring(0, 60), // İlk 60 karakter başlık kabul edilir
                summary: description,
                body: description,
                type: typeSelect ? typeSelect.value : 'story',
                language: langSelect ? langSelect.value : 'tr',
                status: status,
                cover_image_url: fileUrl,
                tags: tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : []
            };

            await createContentItem(payload);
            alert(`İçerik başarıyla ${status === 'published' ? 'yayınlandı' : 'taslak olarak kaydedildi'}!`);

            // Formu Temizle & Kütüphaneyi Yenile
            clearForm();
            loadLibrary();

        } catch (err) {
            alert('Kayıt sırasında hata oluştu: ' + err.message);
        } finally {
            if (btnPublish) btnPublish.disabled = false;
            if (btnSaveDraft) btnSaveDraft.disabled = false;
        }
    }

    // 2. Formu Temizleme
    function clearForm() {
        if (descriptionInput) descriptionInput.value = '';
        if (categoryInput) categoryInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (fileInput) fileInput.value = '';
    }

    // 3. Kayıtlı İçerikleri Listeleme
    async function loadLibrary() {
        if (!libraryList) return;
        libraryList.innerHTML = '<p>Yükleniyor...</p>';

        try {
            const { data, error } = await db
                .from('content_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                libraryList.innerHTML = '<p>Henüz kayıtlı içerik bulunmuyor.</p>';
                return;
            }

            libraryList.innerHTML = data.map(item => `
                <div style="border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>${item.title}</strong>
                        <span style="font-size: 12px; padding: 2px 6px; border-radius: 4px; background: ${item.status === 'published' ? '#d4edda' : '#fff3cd'};">
                            ${item.status}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #555; margin: 6px 0;">${item.summary}</p>
                    <small>Dil: ${item.language.toUpperCase()} | Tip: ${item.type}</small>
                    ${item.cover_image_url ? `<div style="margin-top: 6px;"><a href="${item.cover_image_url}" target="_blank">Ekli Medyayı Gör</a></div>` : ''}
                </div>
            `).join('');

        } catch (err) {
            libraryList.innerHTML = `<p style="color:red;">Kütüphane yüklenirken hata: ${err.message}</p>`;
        }
    }

    // Event Listener Bağlantıları
    if (btnPublish) btnPublish.addEventListener('click', () => saveForm('published'));
    if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => saveForm('draft'));
    if (btnClear) btnClear.addEventListener('click', clearForm);
    if (btnRefresh) btnRefresh.addEventListener('click', loadLibrary);

    // Sayfa açıldığında kütüphaneyi getir
    loadLibrary();
});
