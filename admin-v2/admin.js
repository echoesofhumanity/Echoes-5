document.addEventListener("DOMContentLoaded", () => {
  const BUCKET_NAME = "echoes-media";

  // Supabase İstemcisini Otomatik Taramalı ve Güvenli Başlatma
  function getSupabaseClient() {
    // 1. Yaygın bilinen istemci değişken isimleri
    const candidates = [
      window.supabaseClient,
      window.ECHOES_SUPABASE,
      window.supabaseDb,
      window.db,
      window.client,
      window.supabaseApi
    ];

    for (const c of candidates) {
      if (c && typeof c.from === "function") return c;
    }

    // 2. Özel API nesnesi kontrolü
    if (window.ECHOES_SUPABASE_API && typeof window.ECHOES_SUPABASE_API.getClient === "function") {
      const c = window.ECHOES_SUPABASE_API.getClient();
      if (c && typeof c.from === "function") return c;
    }

    // 3. Window üzerindeki `.from` metoduna sahip tüm aktif istemcileri tara
    for (const key in window) {
      try {
        if (key !== "supabase" && window[key] && typeof window[key] === "object" && typeof window[key].from === "function") {
          return window[key];
        }
      } catch (e) {}
    }

    // 4. CDN (createClient) üzerinden URL ve KEY ile yeni istemci türetme
    if (window.supabase && typeof window.supabase.createClient === "function") {
      const url = window.SUPABASE_URL || window.ECHOES_SUPABASE_URL || (window.ECHOES_CONFIG && window.ECHOES_CONFIG.SUPABASE_URL);
      const key = window.SUPABASE_ANON_KEY || window.ECHOES_SUPABASE_KEY || window.ECHOES_SUPABASE_ANON_KEY || (window.ECHOES_CONFIG && window.ECHOES_CONFIG.SUPABASE_KEY);
      
      if (url && key) {
        window.supabaseClient = window.supabase.createClient(url, key);
        return window.supabaseClient;
      }
    }

    return null;
  }

  // HTML Elemanları
  const alertBox = document.getElementById("statusAlert");
  const form = document.getElementById("contentForm");
  const editingIdInput = document.getElementById("editingId");
  const titleInput = document.getElementById("contentTitle");
  const typeSelect = document.getElementById("contentType");
  const langSelect = document.getElementById("contentLanguage");
  const categoryInput = document.getElementById("contentCategory");
  const descInput = document.getElementById("contentDescription");
  const tagsInput = document.getElementById("contentTags");
  const fileInput = document.getElementById("contentFile");

  const sectionForm = document.getElementById("sectionForm");
  const sectionLibrary = document.getElementById("sectionLibrary");
  const libraryList = document.getElementById("libraryList");

  // Navigasyon Kontrolleri
  document.getElementById("navNewContent").addEventListener("click", () => {
    resetForm();
    sectionForm.style.display = "block";
    sectionLibrary.style.display = "none";
  });

  document.getElementById("navLibrary").addEventListener("click", () => {
    sectionForm.style.display = "none";
    sectionLibrary.style.display = "block";
    loadLibrary();
  });

  function showAlert(msg, type = "info") {
    alertBox.textContent = msg;
    alertBox.className = `alert ${type}`;
    if (msg) setTimeout(() => { alertBox.className = "alert"; }, 5000);
  }

  function resetForm() {
    form.reset();
    editingIdInput.value = "";
    document.getElementById("formTitle").textContent = "Yeni İçerik Ekle";
  }

  // Dosya Yükleme İşlemi
  async function uploadFile(supabase, file) {
    if (!file) return null;
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `uploads/${Date.now()}-${cleanName}`;
    
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
    if (error) throw error;
    return filePath;
  }

  // Kaydet / Güncelle
  async function handleSave(status) {
    const supabase = getSupabaseClient();
    if (!supabase) return showAlert("Supabase istemcisi yüklenemedi. Yapılandırma dosyasını kontrol edin.", "error");

    const title = titleInput.value.trim();
    if (!title) return showAlert("Lütfen bir başlık girin.", "error");

    try {
      showAlert("Kaydediliyor...", "info");

      let filePath = null;
      if (fileInput.files[0]) {
        filePath = await uploadFile(supabase, fileInput.files[0]);
      }

      const tags = tagsInput.value ? tagsInput.value.split(",").map(t => t.trim()).filter(Boolean) : [];
      const editingId = editingIdInput.value;

      const payload = {
        title: title,
        type: typeSelect.value,
        language: langSelect.value,
        category: categoryInput.value.trim() || null,
        description: descInput.value.trim() || null,
        tags: tags,
        status: status,
        published_at: status === "published" ? new Date().toISOString() : null
      };

      if (filePath) payload.file_path = filePath;

      let res;
      if (editingId) {
        res = await supabase.from("content_items").update(payload).eq("id", editingId);
      } else {
        res = await supabase.from("content_items").insert(payload);
      }

      if (res.error) throw res.error;

      showAlert(editingId ? "İçerik güncellendi!" : "İçerik başarıyla kaydedildi!", "success");
      resetForm();
    } catch (err) {
      console.error(err);
      showAlert("Hata: " + err.message, "error");
    }
  }

  // Buton Dinleyicileri
  document.getElementById("btnSaveDraft").addEventListener("click", () => handleSave("draft"));
  document.getElementById("btnPublish").addEventListener("click", () => handleSave("published"));
  document.getElementById("btnClear").addEventListener("click", resetForm);
  document.getElementById("btnRefresh").addEventListener("click", loadLibrary);

  // Kütüphane Yükleme
  async function loadLibrary() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      libraryList.innerHTML = "<p style='color:#ef4444;'>Hata: Supabase bağlantısı kurulamadı.</p>";
      return;
    }

    libraryList.innerHTML = "Yükleniyor...";

    try {
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        libraryList.innerHTML = "<p style='color:#94a3b8;'>Henüz içerik bulunmuyor.</p>";
        return;
      }

      libraryList.innerHTML = data.map(item => `
        <div class="card">
          <div style="display:flex; justify-content:space-between;">
            <h4 style="margin:0; color:#38bdf8;">${item.title}</h4>
            <span style="font-size:0.8rem; background:#334155; padding:2px 8px; border-radius:4px;">${item.status}</span>
          </div>
          <p style="font-size:0.85rem; color:#94a3b8; margin:8px 0 0 0;">
            Tip: <strong>${item.type}</strong> | Dil: <strong>${item.language}</strong> ${item.category ? '| Kat: ' + item.category : ''}
          </p>
          <div class="card-actions">
            <button class="btn-sm btn-warning" onclick="editItem('${item.id}')">Düzenle</button>
            <button class="btn-sm btn-danger" onclick="deleteItem('${item.id}', '${item.file_path || ''}')">Sil</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      libraryList.innerHTML = "<p style='color:#ef4444;'>Hata: " + err.message + "</p>";
    }
  }

  // Global Düzenle ve Sil Fonksiyonları
  window.editItem = async (id) => {
    const supabase = getSupabaseClient();
    if (!supabase) return showAlert("Supabase bağlantısı kurulamadı.", "error");

    const { data, error } = await supabase.from("content_items").select("*").eq("id", id).single();
    if (error || !data) return showAlert("Detay getirilemedi.", "error");

    editingIdInput.value = data.id;
    titleInput.value = data.title || "";
    typeSelect.value = data.type || "story";
    langSelect.value = data.language || "tr";
    categoryInput.value = data.category || "";
    descInput.value = data.description || "";
    tagsInput.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";

    document.getElementById("formTitle").textContent = "İçeriği Düzenle";
    sectionForm.style.display = "block";
    sectionLibrary.style.display = "none";
  };

  window.deleteItem = async (id, filePath) => {
    const supabase = getSupabaseClient();
    if (!supabase) return showAlert("Supabase bağlantısı kurulamadı.", "error");

    if (!confirm("Bu içeriği silmek istediğinizden emin misiniz?")) return;

    try {
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) throw error;

      if (filePath) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }

      showAlert("İçerik silindi.", "success");
      loadLibrary();
    } catch (err) {
      showAlert("Silme hatası: " + err.message, "error");
    }
  };
});
      
