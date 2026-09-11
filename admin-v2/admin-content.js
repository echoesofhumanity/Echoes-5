/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   CONTENT MANAGEMENT MODULE
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const contentForm =
    document.getElementById("contentForm");

  const editingContentId =
    document.getElementById("editingContentId");

  const contentTitleInput =
    document.getElementById("contentTitleInput");

  const contentType =
    document.getElementById("contentType");

  const contentLanguage =
    document.getElementById("contentLanguage");

  const contentCategory =
    document.getElementById("contentCategory");

  const contentStatus =
    document.getElementById("contentStatus");

  const contentDescriptionInput =
    document.getElementById(
      "contentDescriptionInput"
    );

  const contentTags =
    document.getElementById("contentTags");

  const uploadZone =
    document.getElementById("uploadZone");

  const contentFileInput =
    document.getElementById("contentFileInput");

  const chooseFileButton =
    document.getElementById(
      "chooseFileButton"
    );

  const selectedFileInfo =
    document.getElementById(
      "selectedFileInfo"
    );

  const mediaPreview =
    document.getElementById("mediaPreview");

  const clearContentButton =
    document.getElementById(
      "clearContentButton"
    );

  const saveDraftButton =
    document.getElementById(
      "saveDraftButton"
    );

  const publishContentButton =
    document.getElementById(
      "publishContentButton"
    );

  const contentFormMessage =
    document.getElementById(
      "contentFormMessage"
    );


  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabaseApi =
    window.ECHOES_SUPABASE_API;

  const supabaseClient =
    supabaseApi && supabaseApi.isReady()
      ? supabaseApi.getClient()
      : null;


  /* =======================================================
     CONSTANTS
     ======================================================= */

  const STORAGE_BUCKET =
    "echoes-media";

  const SUPPORTED_TYPES = [
    "story",
    "video",
    "image",
    "music",
    "document"
  ];

  const SUPPORTED_LANGUAGES = [
    "en",
    "tr",
    "hr",
    "fr",
    "es"
  ];

  const CONTENT_STATUSES = [
    "draft",
    "pending",
    "published",
    "archived"
  ];


  /* =======================================================
     STATE
     ======================================================= */

  let selectedFile = null;
  let currentObjectUrl = null;
  let saving = false;


  /* =======================================================
     MESSAGE
     ======================================================= */

  function setMessage(
    message,
    type = ""
  ) {
    if (!contentFormMessage) {
      return;
    }

    contentFormMessage.textContent =
      message;

    contentFormMessage.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      contentFormMessage.classList.add(
        `is-${type}`
      );
    }
  }


  /* =======================================================
     USER
     ======================================================= */

  function getCurrentUser() {
    const auth =
      window.ECHOES_ADMIN_AUTH;

    if (!auth) {
      return null;
    }

    return auth.getCurrentUser();
  }


  /* =======================================================
     FILE HELPERS
     ======================================================= */

  function sanitizeFileName(fileName) {
    return String(fileName || "")
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      )
      .slice(0, 160) || "file";
  }


  function createStoragePath(
    userId,
    fileName
  ) {
    const safeName =
      sanitizeFileName(fileName);

    const uniqueId =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    return (
      `media/${userId}/` +
      `${uniqueId}-${safeName}`
    );
  }


  function revokeObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(
        currentObjectUrl
      );

      currentObjectUrl = null;
    }
  }


  /* =======================================================
     FILE DISPLAY
     ======================================================= */

  function clearFileDisplay() {
    revokeObjectUrl();

    if (selectedFileInfo) {
      selectedFileInfo.hidden = true;
      selectedFileInfo.textContent = "";
    }

    if (mediaPreview) {
      mediaPreview.hidden = true;
      mediaPreview.innerHTML = "";
    }
  }


  function formatFileSize(bytes) {
    const value =
      Number(bytes) || 0;

    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 * 1024) {
      return `${(
        value / 1024
      ).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
      return `${(
        value /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      value /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  }


  function showSelectedFile(file) {
    clearFileDisplay();

    if (!file) {
      return;
    }

    if (selectedFileInfo) {
      selectedFileInfo.hidden = false;

      selectedFileInfo.textContent =
        `${file.name} · ${formatFileSize(file.size)}`;
    }

    if (!mediaPreview) {
      return;
    }

    mediaPreview.hidden = false;

    const type =
      String(file.type || "")
        .toLowerCase();

    if (type.startsWith("image/")) {
      currentObjectUrl =
        URL.createObjectURL(file);

      const image =
        document.createElement("img");

      image.src = currentObjectUrl;
      image.alt = file.name;

      mediaPreview.appendChild(image);

      return;
    }

    if (type.startsWith("video/")) {
      currentObjectUrl =
        URL.createObjectURL(file);

      const video =
        document.createElement("video");

      video.src = currentObjectUrl;
      video.controls = true;
      video.preload = "metadata";

      mediaPreview.appendChild(video);

      return;
    }

    if (type.startsWith("audio/")) {
      currentObjectUrl =
        URL.createObjectURL(file);

      const audio =
        document.createElement("audio");

      audio.src = currentObjectUrl;
      audio.controls = true;

      mediaPreview.appendChild(audio);

      return;
    }

    const message =
      document.createElement("p");

    message.textContent =
      "Selected file is ready for upload.";

    mediaPreview.appendChild(message);
  }


  /* =======================================================
     FILE SELECTION
     ======================================================= */

  function setSelectedFile(file) {
    if (!(file instanceof File)) {
      selectedFile = null;
      clearFileDisplay();
      return;
    }

    selectedFile = file;

    showSelectedFile(file);
  }


  function handleFileInputChange(event) {
    const file =
      event.target &&
      event.target.files &&
      event.target.files[0]
        ? event.target.files[0]
        : null;

    setSelectedFile(file);
        }

    /* =======================================================
     FORM DATA
     ======================================================= */

  function parseTags(value) {
    return String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter(
        (tag, index, array) =>
          array.indexOf(tag) === index
      );
  }


  function getFormData(statusOverride = null) {
    const status =
      statusOverride ||
      (
        contentStatus
          ? contentStatus.value
          : "draft"
      );

    return {
      title:
        contentTitleInput
          ? contentTitleInput.value.trim()
          : "",

      type:
        contentType
          ? contentType.value
          : "",

      language:
        contentLanguage
          ? contentLanguage.value
          : "en",

      category:
        contentCategory
          ? contentCategory.value.trim()
          : "",

      description:
        contentDescriptionInput
          ? contentDescriptionInput.value.trim()
          : "",

      tags:
        parseTags(
          contentTags
            ? contentTags.value
            : ""
        ),

      status
    };
  }


  /* =======================================================
     VALIDATION
     ======================================================= */

  function validateForm(data) {
    if (!data.title) {
      return "Title is required.";
    }

    if (
      !SUPPORTED_TYPES.includes(
        data.type
      )
    ) {
      return "Select a valid content type.";
    }

    if (
      !SUPPORTED_LANGUAGES.includes(
        data.language
      )
    ) {
      return "Select a valid language.";
    }

    if (
      !CONTENT_STATUSES.includes(
        data.status
      )
    ) {
      return "Select a valid content status.";
    }

    return null;
  }


  /* =======================================================
     FORM STATE
     ======================================================= */

  function isEditing() {
    return !!(
      editingContentId &&
      editingContentId.value.trim()
    );
  }


  function setEditingId(id) {
    if (!editingContentId) {
      return;
    }

    editingContentId.value =
      id || "";
  }


  function setFormLoading(isLoading) {
    const buttons = [
      clearContentButton,
      saveDraftButton,
      publishContentButton
    ];

    buttons.forEach((button) => {
      if (button) {
        button.disabled =
          isLoading;
      }
    });

    if (saveDraftButton) {
      saveDraftButton.textContent =
        isLoading
          ? "Saving…"
          : "Save Draft";
    }

    if (publishContentButton) {
      publishContentButton.textContent =
        isLoading
          ? "Publishing…"
          : "Publish";
    }
  }


  /* =======================================================
     STORAGE UPLOAD
     ======================================================= */

  async function uploadFile(
    file,
    userId
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    if (!file) {
      return null;
    }

    const path =
      createStoragePath(
        userId,
        file.name
      );

    const {
      error
    } = await supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          contentType:
            file.type ||
            "application/octet-stream",
          upsert: false
        }
      );

    if (error) {
      throw error;
    }

    return path;
  }


  /* =======================================================
     STORAGE DELETE
     ======================================================= */

  async function deleteStorageFile(
    path
  ) {
    if (
      !supabaseClient ||
      !path
    ) {
      return;
    }

    const {
      error
    } = await supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .remove([
        path
      ]);

    if (error) {
      throw error;
    }
  }


  /* =======================================================
     DATABASE INSERT
     ======================================================= */

  async function insertContent(
    data,
    filePath,
    userId
  ) {
    const payload = {
      title: data.title,
      type: data.type,
      language: data.language,
      category:
        data.category || null,
      description:
        data.description || null,
      tags: data.tags,
      file_path:
        filePath || null,
      status: data.status,
      author_id: userId,
      published_at:
        data.status === "published"
          ? new Date().toISOString()
          : null
    };

    const {
      data: inserted,
      error
    } = await supabaseClient
      .from("content_items")
      .insert(payload)
      .select(
        "id, title, type, language, category, status, file_path, published_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return inserted;
  }


  /* =======================================================
     DATABASE UPDATE
     ======================================================= */

  async function updateContent(
    id,
    data,
    filePath
  ) {
    const payload = {
      title: data.title,
      type: data.type,
      language: data.language,
      category:
        data.category || null,
      description:
        data.description || null,
      tags: data.tags,
      status: data.status,
      updated_at:
        new Date().toISOString()
    };

    if (filePath) {
      payload.file_path =
        filePath;
    }

    if (
      data.status === "published"
    ) {
      payload.published_at =
        new Date().toISOString();
    } else {
      payload.published_at = null;
    }

    const {
      data: updated,
      error
    } = await supabaseClient
      .from("content_items")
      .update(payload)
      .eq("id", id)
      .select(
        "id, title, type, language, category, status, file_path, published_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return updated;
  }


  /* =======================================================
     EXISTING CONTENT
     ======================================================= */

  async function getContentById(id) {
    const {
      data,
      error
    } = await supabaseClient
      .from("content_items")
      .select(
        "id, title, type, language, category, description, tags, status, file_path, published_at"
      )
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data;
        }

   /* =======================================================
     SAVE CONTENT
     ======================================================= */

  async function saveContent(
    statusOverride
  ) {
    if (saving) {
      return null;
    }

    if (!supabaseClient) {
      setMessage(
        "Supabase is unavailable.",
        "error"
      );

      return null;
    }

    const user =
      getCurrentUser();

    if (!user) {
      setMessage(
        "Your administrator session is not available.",
        "error"
      );

      return null;
    }

    const data =
      getFormData(
        statusOverride
      );

    const validationError =
      validateForm(data);

    if (validationError) {
      setMessage(
        validationError,
        "error"
      );

      return null;
    }

    const editing =
      isEditing();

    const contentId =
      editingContentId
        ? editingContentId.value.trim()
        : "";

    let uploadedPath = null;
    let previousFilePath = null;

    saving = true;
    setFormLoading(true);

    setMessage(
      editing
        ? "Updating content…"
        : "Creating content…",
      "warning"
    );

    try {

      /* ---------------------------------------------------
         Read previous media before an update
         --------------------------------------------------- */

      if (editing) {
        const existing =
          await getContentById(
            contentId
          );

        previousFilePath =
          existing.file_path || null;
      }


      /* ---------------------------------------------------
         Upload new media first
         --------------------------------------------------- */

      if (selectedFile) {
        uploadedPath =
          await uploadFile(
            selectedFile,
            user.id
          );
      }


      /* ---------------------------------------------------
         Database operation
         --------------------------------------------------- */

      let result;

      if (editing) {
        result =
          await updateContent(
            contentId,
            data,
            uploadedPath
          );
      } else {
        result =
          await insertContent(
            data,
            uploadedPath,
            user.id
          );
      }


      /* ---------------------------------------------------
         Remove previous media only after DB success
         --------------------------------------------------- */

      if (
        editing &&
        uploadedPath &&
        previousFilePath &&
        previousFilePath !== uploadedPath
      ) {
        try {
          await deleteStorageFile(
            previousFilePath
          );
        } catch (storageError) {
          console.error(
            "Echoes Admin V2: Previous media cleanup failed.",
            storageError
          );

          setMessage(
            "Content was saved, but the previous media file could not be removed.",
            "warning"
          );
        }
      }


      /* ---------------------------------------------------
         Success
         --------------------------------------------------- */

      if (
        !(
          editing &&
          uploadedPath &&
          previousFilePath &&
          previousFilePath !== uploadedPath
        )
      ) {
        setMessage(
          editing
            ? "Content updated successfully."
            : "Content created successfully.",
          "success"
        );
      }


      emit(
        "echoes:content-saved",
        {
          content: result,
          editing
        }
      );

      clearForm();

      return result;

    } catch (error) {

      console.error(
        "Echoes Admin V2: Content save failed.",
        error
      );


      /* ---------------------------------------------------
         Remove newly uploaded orphan if DB operation failed
         --------------------------------------------------- */

      if (uploadedPath) {
        try {
          await deleteStorageFile(
            uploadedPath
          );
        } catch (cleanupError) {
          console.error(
            "Echoes Admin V2: Orphan media cleanup failed.",
            cleanupError
          );
        }
      }


      setMessage(
        "Content could not be saved. Please try again.",
        "error"
      );

      emit(
        "echoes:content-error",
        {
          error
        }
      );

      return null;

    } finally {
      saving = false;
      setFormLoading(false);
    }
  }


  /* =======================================================
     CLEAR FORM
     ======================================================= */

  function clearForm() {
    if (contentForm) {
      contentForm.reset();
    }

    setEditingId("");

    selectedFile = null;

    clearFileDisplay();

    if (contentLanguage) {
      contentLanguage.value =
        "en";
    }

    if (contentStatus) {
      contentStatus.value =
        "draft";
    }

    setMessage("");
  }


  /* =======================================================
     LOAD CONTENT INTO EDITOR
     ======================================================= */

  async function editContent(id) {
    if (!id) {
      return null;
    }

    if (!supabaseClient) {
      setMessage(
        "Supabase is unavailable.",
        "error"
      );

      return null;
    }

    setMessage(
      "Loading content…",
      "warning"
    );

    try {
      const content =
        await getContentById(id);

      if (contentTitleInput) {
        contentTitleInput.value =
          content.title || "";
      }

      if (contentType) {
        contentType.value =
          content.type || "";
      }

      if (contentLanguage) {
        contentLanguage.value =
          content.language || "en";
      }

      if (contentCategory) {
        contentCategory.value =
          content.category || "";
      }

      if (contentStatus) {
        contentStatus.value =
          content.status || "draft";
      }

      if (contentDescriptionInput) {
        contentDescriptionInput.value =
          content.description || "";
      }

      if (contentTags) {
        contentTags.value =
          Array.isArray(content.tags)
            ? content.tags.join(", ")
            : "";
      }

      setEditingId(
        content.id
      );

      selectedFile = null;

      clearFileDisplay();

      setMessage(
        "Content loaded for editing.",
        "success"
      );

      emit(
        "echoes:content-editing",
        {
          content
        }
      );

      return content;

    } catch (error) {

      console.error(
        "Echoes Admin V2: Content load failed.",
        error
      );

      setMessage(
        "Unable to load this content.",
        "error"
      );

      emit(
        "echoes:content-error",
        {
          error
        }
      );

      return null;
    }
  }


  /* =======================================================
     DELETE CONTENT
     ======================================================= */

  async function deleteContent(id) {
    if (!id) {
      return false;
    }

    if (!supabaseClient) {
      return false;
    }

    const confirmed =
      window.confirm(
        "Delete this content permanently?"
      );

    if (!confirmed) {
      return false;
    }

    try {
      const content =
        await getContentById(id);

      const {
        error
      } = await supabaseClient
        .from("content_items")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      let storageWarning = false;

      if (content.file_path) {
        try {
          await deleteStorageFile(
            content.file_path
          );
        } catch (storageError) {
          storageWarning = true;

          console.error(
            "Echoes Admin V2: Media deletion failed.",
            storageError
          );
        }
      }

      emit(
        "echoes:content-deleted",
        {
          id,
          storageWarning
        }
      );

      if (storageWarning) {
        setMessage(
          "Content deleted, but its media file could not be removed.",
          "warning"
        );
      } else {
        setMessage(
          "Content deleted successfully.",
          "success"
        );
      }

      return true;

    } catch (error) {

      console.error(
        "Echoes Admin V2: Content deletion failed.",
        error
      );

      setMessage(
        "Content could not be deleted.",
        "error"
      );

      emit(
        "echoes:content-error",
        {
          error
        }
      );

      return false;
    }
        }

   /* =======================================================
     NAVIGATION TO CONTENT EDITOR
     ======================================================= */

  function openEditorSection() {
    window.dispatchEvent(
      new CustomEvent(
        "echoes:navigate",
        {
          detail: {
            sectionId:
              "contentSection"
          }
        }
      )
    );
  }


  /* =======================================================
     DRAG & DROP
     ======================================================= */

  function handleDragOver(event) {
    event.preventDefault();

    if (uploadZone) {
      uploadZone.classList.add(
        "is-dragover"
      );
    }
  }


  function handleDragLeave(event) {
    event.preventDefault();

    if (uploadZone) {
      uploadZone.classList.remove(
        "is-dragover"
      );
    }
  }


  function handleDrop(event) {
    event.preventDefault();

    if (uploadZone) {
      uploadZone.classList.remove(
        "is-dragover"
      );
    }

    const file =
      event.dataTransfer &&
      event.dataTransfer.files &&
      event.dataTransfer.files[0]
        ? event.dataTransfer.files[0]
        : null;

    setSelectedFile(file);
  }


  /* =======================================================
     UPLOAD ZONE
     ======================================================= */

  function openFilePicker() {
    if (!contentFileInput) {
      return;
    }

    contentFileInput.click();
  }


  function handleUploadZoneKeydown(event) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      openFilePicker();
    }
  }


  /* =======================================================
     APPLICATION EVENTS
     ======================================================= */

  function registerApplicationEvents() {

    window.addEventListener(
      "echoes:signed-out",
      () => {
        clearForm();
      }
    );


    window.addEventListener(
      "echoes:content-edit-request",
      (event) => {
        const id =
          event.detail &&
          event.detail.id
            ? event.detail.id
            : "";

        if (!id) {
          return;
        }

        editContent(id)
          .then((content) => {
            if (content) {
              openEditorSection();
            }
          });
      }
    );


    window.addEventListener(
      "echoes:content-delete-request",
      (event) => {
        const id =
          event.detail &&
          event.detail.id
            ? event.detail.id
            : "";

        if (!id) {
          return;
        }

        deleteContent(id);
      }
    );
  }


  /* =======================================================
     DOM EVENTS
     ======================================================= */

  function registerDomEvents() {

    if (contentFileInput) {
      contentFileInput.addEventListener(
        "change",
        handleFileInputChange
      );
    }


    if (chooseFileButton) {
      chooseFileButton.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          openFilePicker();
        }
      );
    }


    if (uploadZone) {
      uploadZone.addEventListener(
        "click",
        (event) => {
          if (
            event.target ===
            chooseFileButton
          ) {
            return;
          }

          openFilePicker();
        }
      );

      uploadZone.addEventListener(
        "keydown",
        handleUploadZoneKeydown
      );

      uploadZone.addEventListener(
        "dragover",
        handleDragOver
      );

      uploadZone.addEventListener(
        "dragleave",
        handleDragLeave
      );

      uploadZone.addEventListener(
        "drop",
        handleDrop
      );
    }


    if (clearContentButton) {
      clearContentButton.addEventListener(
        "click",
        clearForm
      );
    }


    if (saveDraftButton) {
      saveDraftButton.addEventListener(
        "click",
        () => {
          saveContent("draft");
        }
      );
    }


    if (publishContentButton) {
      publishContentButton.addEventListener(
        "click",
        () => {
          saveContent("published");
        }
      );
    }
  }


  /* =======================================================
     EVENT HELPER
     ======================================================= */

  function emit(
    name,
    detail = {}
  ) {
    window.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ECHOES_ADMIN_CONTENT = {
    saveContent,
    clearForm,
    editContent,
    deleteContent,

    getSelectedFile() {
      return selectedFile;
    },

    isEditing() {
      return isEditing();
    },

    getEditingContentId() {
      return editingContentId
        ? editingContentId.value.trim()
        : "";
    },

    getSupportedTypes() {
      return [
        ...SUPPORTED_TYPES
      ];
    },

    getSupportedLanguages() {
      return [
        ...SUPPORTED_LANGUAGES
      ];
    },

    getStatuses() {
      return [
        ...CONTENT_STATUSES
      ];
    },

    isSaving() {
      return saving;
    }
  };


  /* =======================================================
     STARTUP
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        registerDomEvents();
        registerApplicationEvents();
      },
      {
        once: true
      }
    );
  } else {
    registerDomEvents();
    registerApplicationEvents();
  }

})();
