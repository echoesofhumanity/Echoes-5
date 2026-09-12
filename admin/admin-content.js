(() => {
  "use strict";

  const STORAGE_BUCKET = "echoes-media";
  const SUPPORTED_TYPES = ["story", "video", "image", "music", "document"];
  const SUPPORTED_LANGUAGES = ["en", "tr", "hr", "fr", "es"];
  const CONTENT_STATUSES = ["draft", "pending", "published", "archived"];

  const refs = {
    contentForm: null,
    editingContentId: null,
    contentTitleInput: null,
    contentType: null,
    contentLanguage: null,
    contentCategory: null,
    contentStatus: null,
    contentDescriptionInput: null,
    contentTags: null,
    uploadZone: null,
    contentFileInput: null,
    chooseFileButton: null,
    selectedFileInfo: null,
    mediaPreview: null,
    clearContentButton: null,
    saveDraftButton: null,
    publishContentButton: null,
    contentFormMessage: null
  };

  let selectedFile = null;
  let currentObjectUrl = null;
  let saving = false;
  let initialized = false;

  function cacheDom() {
    refs.contentForm = document.getElementById("contentForm");
    refs.editingContentId = document.getElementById("editingContentId");
    refs.contentTitleInput = document.getElementById("contentTitleInput");
    refs.contentType = document.getElementById("contentType");
    refs.contentLanguage = document.getElementById("contentLanguage");
    refs.contentCategory = document.getElementById("contentCategory");
    refs.contentStatus = document.getElementById("contentStatus");
    refs.contentDescriptionInput = document.getElementById("contentDescriptionInput");
    refs.contentTags = document.getElementById("contentTags");
    refs.uploadZone = document.getElementById("uploadZone");
    refs.contentFileInput = document.getElementById("contentFileInput");
    refs.chooseFileButton = document.getElementById("chooseFileButton");
    refs.selectedFileInfo = document.getElementById("selectedFileInfo");
    refs.mediaPreview = document.getElementById("mediaPreview");
    refs.clearContentButton = document.getElementById("clearContentButton");
    refs.saveDraftButton = document.getElementById("saveDraftButton");
    refs.publishContentButton = document.getElementById("publishContentButton");
    refs.contentFormMessage = document.getElementById("contentFormMessage");
  }

  function getSupabase() {
    if (
      window.ECHOES_SUPABASE_API &&
      typeof window.ECHOES_SUPABASE_API.getClient === "function"
    ) {
      return window.ECHOES_SUPABASE_API.getClient();
    }

    return window.ECHOES_SUPABASE || null;
  }

  function isSupabaseReady() {
    return Boolean(
      window.ECHOES_SUPABASE_API &&
      typeof window.ECHOES_SUPABASE_API.isReady === "function" &&
      window.ECHOES_SUPABASE_API.isReady()
    );
  }

  function getCurrentUser() {
    if (
      window.ECHOES_ADMIN_AUTH &&
      typeof window.ECHOES_ADMIN_AUTH.getCurrentUser === "function"
    ) {
      return window.ECHOES_ADMIN_AUTH.getCurrentUser();
    }

    return null;
  }

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  function setMessage(message = "", type = "") {
    if (!refs.contentFormMessage) return;

    refs.contentFormMessage.textContent = message;
    refs.contentFormMessage.classList.remove("success", "warning", "error");

    if (type) {
      refs.contentFormMessage.classList.add(type);
    }
  }

  function setLoading(value) {
    saving = Boolean(value);

    if (refs.saveDraftButton) refs.saveDraftButton.disabled = saving;
    if (refs.publishContentButton) refs.publishContentButton.disabled = saving;
    if (refs.clearContentButton) refs.clearContentButton.disabled = saving;
    if (refs.chooseFileButton) refs.chooseFileButton.disabled = saving;
  }

  function revokeObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function clearPreview() {
    revokeObjectUrl();
    if (refs.mediaPreview) refs.mediaPreview.innerHTML = "";
  }

  function parseTags(value) {
    if (!value) return [];
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }

  function tagsToText(tags) {
    return Array.isArray(tags) ? tags.join(", ") : "";
  }

  function getFormData(statusOverride = null) {
    return {
      title: refs.contentTitleInput ? refs.contentTitleInput.value.trim() : "",
      type: refs.contentType ? refs.contentType.value : "",
      language: refs.contentLanguage ? refs.contentLanguage.value : "",
      category: refs.contentCategory ? refs.contentCategory.value.trim() : "",
      description: refs.contentDescriptionInput ? refs.contentDescriptionInput.value.trim() : "",
      tags: refs.contentTags ? parseTags(refs.contentTags.value) : [],
      status: statusOverride || (refs.contentStatus ? refs.contentStatus.value : "")
    };
  }

  function validateForm(data) {
    if (!data.title) return "Title is required.";
    if (!SUPPORTED_TYPES.includes(data.type)) return "Select a valid content type.";
    if (!SUPPORTED_LANGUAGES.includes(data.language)) return "Select a valid language.";
    if (!CONTENT_STATUSES.includes(data.status)) return "Select a valid content status.";
    return null;
  }

  function isFileCompatibleWithType(file, type) {
    if (!file) return true;
    const mime = String(file.type || "").toLowerCase();
    if (type === "image") return mime.startsWith("image/");
    if (type === "video") return mime.startsWith("video/");
    if (type === "music") {
      return mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    }
    if (type === "document") {
      return mime === "application/pdf" || mime.startsWith("text/") || /\.(pdf|txt|doc|docx|rtf)$/i.test(file.name);
    }
    if (type === "story") return true;
    return false;
  }

  function createStoragePath(userId, file) {
    const safeName = String(file.name || "file")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "file";

    return `media/${userId}/${crypto.randomUUID()}-${safeName}`;
  }

  async function uploadFile(file, userId) {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseReady()) {
      throw new Error("Supabase connection is unavailable.");
    }

    if (!file) return null;

    const path = createStoragePath(userId, file);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (error) throw error;
    return path;
  }

  async function deleteStorageFile(path) {
    if (!path) return;
    const supabase = getSupabase();
    if (!supabase || !isSupabaseReady()) {
      throw new Error("Supabase connection is unavailable.");
    }

    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    if (error) throw error;
  }

  async function insertContent(data, filePath, userId) {
    const supabase = getSupabase();
    const payload = {
      type: data.type,
      title: data.title,
      description: data.description || null,
      language: data.language,
      category: data.category || null,
      tags: data.tags,
      file_path: filePath || null,
      cover_path: null,
      status: data.status,
      author_id: userId,
      published_at: data.status === "published" ? new Date().toISOString() : null
    };

    const { data: inserted, error } = await supabase
      .from("content_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return inserted;
  }

  async function getContentById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async function updateContent(id, data, filePath) {
    const supabase = getSupabase();
    const payload = {
      type: data.type,
      title: data.title,
      description: data.description || null,
      language: data.language,
      category: data.category || null,
      tags: data.tags,
      status: data.status,
      published_at: data.status === "published" ? new Date().toISOString() : null
    };

    if (filePath !== undefined) {
      payload.file_path = filePath || null;
    }

    const { data: updated, error } = await supabase
      .from("content_items")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return updated;
  }

  function renderSelectedFile(file) {
    if (!refs.selectedFileInfo) return;
    refs.selectedFileInfo.textContent = file ? `${file.name} (${formatBytes(file.size)})` : "";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function renderPreview(file) {
    clearPreview();
    if (!refs.mediaPreview || !file) return;

    const mime = String(file.type || "").toLowerCase();
    currentObjectUrl = URL.createObjectURL(file);
    let element = null;

    if (mime.startsWith("image/")) {
      element = document.createElement("img");
      element.src = currentObjectUrl;
      element.alt = file.name;
    } else if (mime.startsWith("video/")) {
      element = document.createElement("video");
      element.src = currentObjectUrl;
      element.controls = true;
      element.preload = "metadata";
    } else if (mime.startsWith("audio/")) {
      element = document.createElement("audio");
      element.src = currentObjectUrl;
      element.controls = true;
    } else {
      element = document.createElement("div");
      element.textContent = file.name;
    }

    refs.mediaPreview.appendChild(element);
  }

  function setSelectedFile(file) {
    if (file && refs.contentType && !isFileCompatibleWithType(file, refs.contentType.value)) {
      setMessage("The selected file does not match the selected content type.", "error");
      return false;
    }

    selectedFile = file || null;
    renderSelectedFile(selectedFile);
    renderPreview(selectedFile);

    if (refs.contentFileInput && !selectedFile) {
      refs.contentFileInput.value = "";
    }

    setMessage("");
    return true;
  }

  function resetFields() {
    if (refs.contentForm) refs.contentForm.reset();
    if (refs.editingContentId) refs.editingContentId.value = "";
    selectedFile = null;
    renderSelectedFile(null);
    clearPreview();
    setMessage("");

    if (refs.contentType) refs.contentType.value = "story";
    if (refs.contentLanguage) refs.contentLanguage.value = "en";
    if (refs.contentStatus) refs.contentStatus.value = "draft";
  }

  async function saveContent(statusOverride = null) {
    if (saving) return null;

    if (!isSupabaseReady()) {
      setMessage("Supabase connection is unavailable.", "error");
      return null;
    }

    const user = getCurrentUser();
    if (!user || !user.id) {
      setMessage("Administrator session is unavailable.", "error");
      return null;
    }

    const formData = getFormData(statusOverride);
    const validationError = validateForm(formData);
    if (validationError) {
      setMessage(validationError, "error");
      return null;
    }

    if (selectedFile && !isFileCompatibleWithType(selectedFile, formData.type)) {
      setMessage("The selected file does not match the selected content type.", "error");
      return null;
    }

    const editingId = refs.editingContentId ? refs.editingContentId.value.trim() : "";
    const editing = Boolean(editingId);
    let previousFilePath = null;
    let uploadedPath = null;

    setLoading(true);
    setMessage(editing ? "Updating content…" : "Creating content…");

    try {
      if (editing) {
        const existing = await getContentById(editingId);
        previousFilePath = existing.file_path || null;
      }

      if (selectedFile) {
        uploadedPath = await uploadFile(selectedFile, user.id);
      }

      const result = editing
        ? await updateContent(editingId, formData, uploadedPath !== null ? uploadedPath : undefined)
        : await insertContent(formData, uploadedPath, user.id);

      if (editing && uploadedPath && previousFilePath && previousFilePath !== uploadedPath) {
        try {
          await deleteStorageFile(previousFilePath);
        } catch (cleanupError) {
          console.error("Echoes Admin: Previous media cleanup failed.", cleanupError);
          resetFields();
          setMessage("Content was saved, but the previous media file could not be removed.", "warning");
          emit("echoes:content-saved", { content: result, warning: true });
          return result;
        }
      }

      resetFields();
      setMessage(editing ? "Content updated successfully." : "Content created successfully.", "success");
      emit("echoes:content-saved", { content: result });
      return result;
    } catch (error) {
      if (uploadedPath) {
        try {
          await deleteStorageFile(uploadedPath);
        } catch (cleanupError) {
          console.error("Echoes Admin: Uploaded media cleanup failed.", cleanupError);
        }
      }

      console.error("Echoes Admin: Content save failed.", error);
      setMessage(error && error.message ? error.message : "Unable to save content.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function editContent(idOrItem) {
    const id = typeof idOrItem === "object" && idOrItem ? idOrItem.id : idOrItem;
    if (!id || !isSupabaseReady()) return null;

    try {
      const content = typeof idOrItem === "object" && idOrItem ? idOrItem : await getContentById(id);

      if (refs.editingContentId) refs.editingContentId.value = content.id || "";
      if (refs.contentTitleInput) refs.contentTitleInput.value = content.title || "";
      if (refs.contentType) refs.contentType.value = content.type || "story";
      if (refs.contentLanguage) refs.contentLanguage.value = content.language || "en";
      if (refs.contentCategory) refs.contentCategory.value = content.category || "";
      if (refs.contentStatus) refs.contentStatus.value = content.status || "draft";
      if (refs.contentDescriptionInput) refs.contentDescriptionInput.value = content.description || "";
      if (refs.contentTags) refs.contentTags.value = tagsToText(content.tags);

      selectedFile = null;
      renderSelectedFile(null);
      clearPreview();
      setMessage("Content loaded for editing.", "success");
      emit("echoes:content-editing", { content });

      return content;
    } catch (error) {
      console.error("Echoes Admin: Edit load failed.", error);
      setMessage(error && error.message ? error.message : "Unable to load content.", "error");
      return null;
    }
  }

  async function deleteContent(id) {
    if (!id) {
      setMessage("Content ID is missing.", "error");
      return false;
    }

    if (!isSupabaseReady()) {
      setMessage("Supabase connection is unavailable.", "error");
      return false;
    }

    const confirmed = window.confirm("Delete this content permanently?");
    if (!confirmed) return false;

    const supabase = getSupabase();

    try {
      setMessage("Deleting content…");
      const content = await getContentById(id);
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) throw error;

      if (content && content.file_path) {
        try {
          await deleteStorageFile(content.file_path);
        } catch (storageError) {
          console.error("Echoes Admin: Storage file delete failed.", storageError);
        }
      }

      if (refs.editingContentId && refs.editingContentId.value === String(id)) {
        resetFields();
      }

      setMessage("Content deleted successfully.", "success");
      emit("echoes:content-deleted", { id });
      return true;
    } catch (error) {
      console.error("Echoes Admin: Content delete failed.", error);
      setMessage(error && error.message ? error.message : "Unable to delete content.", "error");
      return false;
    }
  }

  function bindEvents() {
    if (refs.chooseFileButton && refs.contentFileInput) {
      refs.chooseFileButton.addEventListener("click", (e) => {
        e.preventDefault();
        refs.contentFileInput.click();
      });
    }

    if (refs.contentFileInput) {
      refs.contentFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) setSelectedFile(file);
      });
    }

    if (refs.uploadZone) {
      refs.uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        refs.uploadZone.classList.add("dragover");
      });

      refs.uploadZone.addEventListener("dragleave", () => {
        refs.uploadZone.classList.remove("dragover");
      });

      refs.uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        refs.uploadZone.classList.remove("dragover");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) setSelectedFile(file);
      });
    }

    if (refs.saveDraftButton) {
      refs.saveDraftButton.addEventListener("click", (e) => {
        e.preventDefault();
        saveContent("draft");
      });
    }

    if (refs.publishContentButton) {
      refs.publishContentButton.addEventListener("click", (e) => {
        e.preventDefault();
        saveContent("published");
      });
    }

    if (refs.clearContentButton) {
      refs.clearContentButton.addEventListener("click", (e) => {
        e.preventDefault();
        resetFields();
      });
    }

    if (refs.contentForm) {
      refs.contentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const currentStatus = refs.contentStatus ? refs.contentStatus.value : "draft";
        saveContent(currentStatus);
      });
    }
  }

  function init() {
    if (initialized) return;
    cacheDom();
    bindEvents();
    initialized = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ECHOES_ADMIN_CONTENT = {
    init,
    saveContent,
    editContent,
    deleteContent,
    resetFields
  };
})();
        
