(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN CONTENT MANAGEMENT
   * ============================================================
   *
   * Responsibilities:
   * - Create content records.
   * - Edit existing content records.
   * - Delete content records.
   * - Upload media to Supabase Storage.
   * - Replace existing media safely.
   * - Preview selected media.
   * - Manage content metadata and publication status.
   * - Notify other Admin modules through CustomEvents.
   *
   * Supported content types:
   * - story
   * - video
   * - image
   * - music
   * - document
   *
   * Supported languages:
   * - en
   * - tr
   * - hr
   * - fr
   * - es
   *
   * Supported statuses:
   * - draft
   * - pending
   * - published
   * - archived
   *
   * This module does NOT:
   * - authenticate users
   * - control navigation
   * - render dashboard statistics
   * - render library filters
   * - manage system settings
   */

  const STORAGE_BUCKET = "echoes-media";

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


  /* ============================================================
     DOM REFERENCES
     ============================================================ */

  const refs = {
    contentForm:
      null,

    editingContentId:
      null,

    contentTitleInput:
      null,

    contentType:
      null,

    contentLanguage:
      null,

    contentCategory:
      null,

    contentStatus:
      null,

    contentDescriptionInput:
      null,

    contentTags:
      null,

    uploadZone:
      null,

    contentFileInput:
      null,

    chooseFileButton:
      null,

    selectedFileInfo:
      null,

    mediaPreview:
      null,

    clearContentButton:
      null,

    saveDraftButton:
      null,

    publishContentButton:
      null,

    contentFormMessage:
      null
  };


  /* ============================================================
     STATE
     ============================================================ */

  let initialized = false;
  let selectedFile = null;
  let currentObjectUrl = null;
  let saving = false;


  /* ============================================================
     DOM CACHE
     ============================================================ */

  function cacheDom() {
    refs.contentForm =
      document.getElementById(
        "contentForm"
      );

    refs.editingContentId =
      document.getElementById(
        "editingContentId"
      );

    refs.contentTitleInput =
      document.getElementById(
        "contentTitleInput"
      );

    refs.contentType =
      document.getElementById(
        "contentType"
      );

    refs.contentLanguage =
      document.getElementById(
        "contentLanguage"
      );

    refs.contentCategory =
      document.getElementById(
        "contentCategory"
      );

    refs.contentStatus =
      document.getElementById(
        "contentStatus"
      );

    refs.contentDescriptionInput =
      document.getElementById(
        "contentDescriptionInput"
      );

    refs.contentTags =
      document.getElementById(
        "contentTags"
      );

    refs.uploadZone =
      document.getElementById(
        "uploadZone"
      );

    refs.contentFileInput =
      document.getElementById(
        "contentFileInput"
      );

    refs.chooseFileButton =
      document.getElementById(
        "chooseFileButton"
      );

    refs.selectedFileInfo =
      document.getElementById(
        "selectedFileInfo"
      );

    refs.mediaPreview =
      document.getElementById(
        "mediaPreview"
      );

    refs.clearContentButton =
      document.getElementById(
        "clearContentButton"
      );

    refs.saveDraftButton =
      document.getElementById(
        "saveDraftButton"
      );

    refs.publishContentButton =
      document.getElementById(
        "publishContentButton"
      );

    refs.contentFormMessage =
      document.getElementById(
        "contentFormMessage"
      );
  }


  /* ============================================================
     SUPABASE ACCESS
     ============================================================ */

  function getSupabase() {
    if (
      !window.ECHOES_SUPABASE_API ||
      typeof
        window.ECHOES_SUPABASE_API.getClient !==
          "function"
    ) {
      return null;
    }

    return window.ECHOES_SUPABASE_API.getClient();
  }


  function isSupabaseReady() {
    return Boolean(
      window.ECHOES_SUPABASE_API &&
      typeof
        window.ECHOES_SUPABASE_API.isReady ===
          "function" &&
      window.ECHOES_SUPABASE_API.isReady()
    );
  }


  /* ============================================================
     AUTH ACCESS
     ============================================================ */

  function getCurrentUser() {
    if (
      !window.ECHOES_ADMIN_AUTH ||
      typeof
        window.ECHOES_ADMIN_AUTH.getCurrentUser !==
          "function"
    ) {
      return null;
    }

    return window.ECHOES_ADMIN_AUTH
      .getCurrentUser();
  }


  /* ============================================================
     EVENT HELPER
     ============================================================ */

  function emit(
    name,
    detail = {}
  ) {
    document.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );
  }


  /* ============================================================
     MESSAGE
     ============================================================ */

  function setMessage(
    message,
    type = ""
  ) {
    if (
      !refs.contentFormMessage
    ) {
      return;
    }

    refs.contentFormMessage.textContent =
      message || "";

    refs.contentFormMessage.classList.remove(
      "success",
      "warning",
      "error"
    );

    if (type) {
      refs.contentFormMessage.classList.add(
        type
      );
    }
  }


  /* ============================================================
     FORM STATE
     ============================================================ */

  function setEditingId(
    id
  ) {
    if (
      !refs.editingContentId
    ) {
      return;
    }

    refs.editingContentId.value =
      id || "";
  }


  function getEditingId() {
    if (
      !refs.editingContentId
    ) {
      return "";
    }

    return refs.editingContentId.value.trim();
  }


  function setFormLoading(
    isLoading
  ) {
    saving = isLoading;

    const controls = [
      refs.saveDraftButton,
      refs.publishContentButton,
      refs.clearContentButton,
      refs.chooseFileButton
    ];

    controls.forEach(
      (button) => {
        if (!button) {
          return;
        }

        button.disabled =
          isLoading;

        button.classList.toggle(
          "is-loading",
          isLoading
        );
      }
    );
  }


  /* ============================================================
     FILE HELPERS
     ============================================================ */

  function getFileExtension(
    fileName
  ) {
    if (
      typeof fileName !==
      "string"
    ) {
      return "";
    }

    const lastDot =
      fileName.lastIndexOf(
        "."
      );

    if (
      lastDot < 0
    ) {
      return "";
    }

    return fileName
      .slice(lastDot + 1)
      .toLowerCase();
  }


  function sanitizeFileName(
    fileName
  ) {
    const extension =
      getFileExtension(
        fileName
      );

    const baseName =
      extension
        ? fileName.slice(
            0,
            -(extension.length + 1)
          )
        : fileName;

    const safeBase =
      baseName
        .normalize("NFKD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^a-zA-Z0-9_-]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        )
        .toLowerCase();

    const finalBase =
      safeBase ||
      "file";

    return extension
      ? `${finalBase}.${extension}`
      : finalBase;
  }


  function createStoragePath(
    userId,
    fileName
  ) {
    const safeName =
      sanitizeFileName(
        fileName
      );

    const uniqueId =
      crypto.randomUUID();

    return [
      "media",
      userId,
      `${uniqueId}-${safeName}`
    ].join("/");
  }


  /* ============================================================
     TAGS
     ============================================================ */

  function parseTags(
    value
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return [];
    }

    return [
      ...new Set(
        value
          .split(",")
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean)
      )
    ];
  }


  function tagsToText(
    tags
  ) {
    if (
      !Array.isArray(tags)
    ) {
      return "";
    }

    return tags.join(
      ", "
    );
  }


  /* ============================================================
     FORM DATA
     ============================================================ */

  function getFormData(
    statusOverride = null
  ) {
    const title =
      refs.contentTitleInput
        ? refs.contentTitleInput.value.trim()
        : "";

    const type =
      refs.contentType
        ? refs.contentType.value
        : "";

    const language =
      refs.contentLanguage
        ? refs.contentLanguage.value
        : "";

    const category =
      refs.contentCategory
        ? refs.contentCategory.value.trim()
        : "";

    const description =
      refs.contentDescriptionInput
        ? refs.contentDescriptionInput.value.trim()
        : "";

    const tags =
      refs.contentTags
        ? parseTags(
            refs.contentTags.value
          )
        : [];

    const status =
      statusOverride ||
      (
        refs.contentStatus
          ? refs.contentStatus.value
          : ""
      );

    return {
      title,
      type,
      language,
      category:
        category || null,
      description:
        description || null,
      tags,
      status
    };
  }


  /* ============================================================
     VALIDATION
     ============================================================ */

  function validateForm(
    data
  ) {
    if (
      !data.title
    ) {
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


  /* ============================================================
     FILE VALIDATION
     ============================================================ */

  function isFileCompatibleWithType(
    file,
    type
  ) {
    if (!file) {
      return true;
    }

    const mime =
      (
        file.type ||
        ""
      ).toLowerCase();

    if (
      type === "image"
    ) {
      return mime.startsWith(
        "image/"
      );
    }

    if (
      type === "video"
    ) {
      return mime.startsWith(
        "video/"
      );
    }

    if (
      type === "music"
    ) {
      return (
        mime.startsWith(
          "audio/"
        ) ||
        /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(
          file.name
        )
      );
    }

    if (
      type === "document"
    ) {
      return (
        mime ===
          "application/pdf" ||
        mime.startsWith(
          "text/"
        ) ||
        /\.(pdf|txt|doc|docx|rtf)$/i.test(
          file.name
        )
      );
    }

    if (
      type === "story"
    ) {
      return true;
    }

    return false;
  }


  /* ============================================================
     PREVIEW CLEANUP
     ============================================================ */

  function revokeObjectUrl() {
    if (
      currentObjectUrl
    ) {
      URL.revokeObjectURL(
        currentObjectUrl
      );

      currentObjectUrl =
        null;
    }
  }


  function clearPreview() {
    revokeObjectUrl();

    if (
      refs.mediaPreview
    ) {
      refs.mediaPreview.innerHTML =
        "";
    }
  }


  /* ============================================================
     MEDIA PREVIEW
     ============================================================ */

  function renderFilePreview(
    file
  ) {
    if (
      !refs.mediaPreview
    ) {
      return;
    }

    clearPreview();

    if (!file) {
      return;
    }

    currentObjectUrl =
      URL.createObjectURL(
        file
      );

    const mime =
      (
        file.type ||
        ""
      ).toLowerCase();

    let element =
      null;

    if (
      mime.startsWith(
        "image/"
      )
    ) {
      element =
        document.createElement(
          "img"
        );

      element.src =
        currentObjectUrl;

      element.alt =
        file.name;
    } else if (
      mime.startsWith(
        "video/"
      )
    ) {
      element =
        document.createElement(
          "video"
        );

      element.src =
        currentObjectUrl;

      element.controls =
        true;

      element.preload =
        "metadata";
    } else if (
      mime.startsWith(
        "audio/"
      )
    ) {
      element =
        document.createElement(
          "audio"
        );

      element.src =
        currentObjectUrl;

      element.controls =
        true;
    }

    if (element) {
      refs.mediaPreview.appendChild(
        element
      );
      return;
    }

    const message =
      document.createElement(
        "div"
      );

    message.className =
      "media-preview-empty";

    message.textContent =
      `Selected file: ${file.name}`;

    refs.mediaPreview.appendChild(
      message
    );
  }


  /* ============================================================
     SELECTED FILE UI
     ============================================================ */

  function renderSelectedFile() {
    if (
      !refs.selectedFileInfo
    ) {
      return;
    }

    if (!selectedFile) {
      refs.selectedFileInfo.textContent =
        "";

      return;
    }

    const sizeInMb =
      selectedFile.size /
      (1024 * 1024);

    const sizeText =
      sizeInMb >= 1
        ? `${sizeInMb.toFixed(2)} MB`
        : `${Math.max(
            1,
            Math.round(
              selectedFile.size /
              1024
            )
          )} KB`;

    refs.selectedFileInfo.textContent =
      `${selectedFile.name} · ${sizeText}`;
  }


  /* ============================================================
     FILE SELECTION
     ============================================================ */

  function setSelectedFile(
    file
  ) {
    if (!file) {
      selectedFile =
        null;

      renderSelectedFile();

      clearPreview();

      return;
    }

    const data =
      getFormData();

    if (
      !isFileCompatibleWithType(
        file,
        data.type
      )
    ) {
      setMessage(
        "The selected file does not match the selected content type.",
        "error"
      );

      return;
    }

    selectedFile =
      file;

    renderSelectedFile();

    renderFilePreview(
      selectedFile
    );

    setMessage("");
  }


  /* ============================================================
     STORAGE UPLOAD
     ============================================================ */

  async function uploadFile(
    file,
    userId
  ) {
    const supabase =
      getSupabase();

    if (
      !supabase ||
      !isSupabaseReady()
    ) {
      throw new Error(
        "Supabase connection is unavailable."
      );
    }

    if (
      !file
    ) {
      return null;
    }

    const path =
      createStoragePath(
        userId,
        file.name
      );

    const {
      error
    } =
      await supabase
        .storage
        .from(
          STORAGE_BUCKET
        )
        .upload(
          path,
          file,
          {
            cacheControl:
              "3600",
            contentType:
              file.type ||
              "application/octet-stream",
            upsert:
              false
          }
        );

    if (error) {
      console.error(
        "Echoes Admin: Storage upload failed.",
        error
      );

      throw new Error(
        "Unable to upload the media file."
      );
    }

    return path;
  }


  /* ============================================================
     STORAGE DELETE
     ============================================================ */

  async function deleteStorageFile(
    path
  ) {
    if (
      !path
    ) {
      return;
    }

    const supabase =
      getSupabase();

    if (
      !supabase ||
      !isSupabaseReady()
    ) {
      throw new Error(
        "Supabase connection is unavailable."
      );
    }

    const {
      error
    } =
      await supabase
        .storage
        .from(
          STORAGE_BUCKET
        )
        .remove([
          path
        ]);

    if (error) {
      console.error(
        "Echoes Admin: Storage delete failed.",
        error
      );

      throw new Error(
        "Unable to remove the media file."
      );
    }
      }

    /* ============================================================
     DATABASE — INSERT
     ============================================================ */

  async function insertContent(
    data,
    filePath,
    userId
  ) {
    const supabase =
      getSupabase();

    const payload = {
      type:
        data.type,

      title:
        data.title,

      description:
        data.description,

      language:
        data.language,

      category:
        data.category,

      tags:
        data.tags,

      file_path:
        filePath,

      status:
        data.status,

      author_id:
        userId
    };

    if (
      data.status ===
      "published"
    ) {
      payload.published_at =
        new Date().toISOString();
    } else {
      payload.published_at =
        null;
    }

    const {
      data: inserted,
      error
    } =
      await supabase
        .from(
          "content_items"
        )
        .insert(
          payload
        )
        .select(
          "id,type,title,description,language,category,tags,file_path,cover_path,status,author_id,created_at,updated_at,published_at"
        )
        .single();

    if (error) {
      console.error(
        "Echoes Admin: Content insert failed.",
        error
      );

      throw new Error(
        "Unable to create the content."
      );
    }

    return inserted;
  }


  /* ============================================================
     DATABASE — READ ONE
     ============================================================ */

  async function getContentById(
    id
  ) {
    const supabase =
      getSupabase();

    if (
      !id
    ) {
      throw new Error(
        "Content ID is required."
      );
    }

    const {
      data,
      error
    } =
      await supabase
        .from(
          "content_items"
        )
        .select(
          "id,type,title,description,language,category,tags,file_path,cover_path,status,author_id,created_at,updated_at,published_at"
        )
        .eq(
          "id",
          id
        )
        .single();

    if (error) {
      console.error(
        "Echoes Admin: Content lookup failed.",
        error
      );

      throw new Error(
        "Unable to load the content."
      );
    }

    return data;
  }


  /* ============================================================
     DATABASE — UPDATE
     ============================================================ */

  async function updateContent(
    id,
    data,
    filePath
  ) {
    const supabase =
      getSupabase();

    const payload = {
      type:
        data.type,

      title:
        data.title,

      description:
        data.description,

      language:
        data.language,

      category:
        data.category,

      tags:
        data.tags,

      status:
        data.status,

      updated_at:
        new Date().toISOString()
    };

    if (
      filePath !==
      undefined
    ) {
      payload.file_path =
        filePath;
    }

    if (
      data.status ===
      "published"
    ) {
      payload.published_at =
        new Date().toISOString();
    } else {
      payload.published_at =
        null;
    }

    const {
      data: updated,
      error
    } =
      await supabase
        .from(
          "content_items"
        )
        .update(
          payload
        )
        .eq(
          "id",
          id
        )
        .select(
          "id,type,title,description,language,category,tags,file_path,cover_path,status,author_id,created_at,updated_at,published_at"
        )
        .single();

    if (error) {
      console.error(
        "Echoes Admin: Content update failed.",
        error
      );

      throw new Error(
        "Unable to update the content."
      );
    }

    return updated;
  }


  /* ============================================================
     FORM RESET
     ============================================================ */

  function resetFields() {
    if (
      refs.contentTitleInput
    ) {
      refs.contentTitleInput.value =
        "";
    }

    if (
      refs.contentType
    ) {
      refs.contentType.value =
        "story";
    }

    if (
      refs.contentLanguage
    ) {
      refs.contentLanguage.value =
        "en";
    }

    if (
      refs.contentCategory
    ) {
      refs.contentCategory.value =
        "";
    }

    if (
      refs.contentStatus
    ) {
      refs.contentStatus.value =
        "draft";
    }

    if (
      refs.contentDescriptionInput
    ) {
      refs.contentDescriptionInput.value =
        "";
    }

    if (
      refs.contentTags
    ) {
      refs.contentTags.value =
        "";
    }

    if (
      refs.contentFileInput
    ) {
      refs.contentFileInput.value =
        "";
    }

    setEditingId(
      ""
    );

    selectedFile =
      null;

    renderSelectedFile();

    clearPreview();
  }


  function clearForm(
    options = {}
  ) {
    const {
      clearMessage = true
    } = options;

    resetFields();

    if (
      clearMessage
    ) {
      setMessage("");
    }
  }


  /* ============================================================
     EDIT FORM POPULATION
     ============================================================ */

  function populateForm(
    content
  ) {
    if (
      refs.contentTitleInput
    ) {
      refs.contentTitleInput.value =
        content.title ||
        "";
    }

    if (
      refs.contentType
    ) {
      refs.contentType.value =
        SUPPORTED_TYPES.includes(
          content.type
        )
          ? content.type
          : "story";
    }

    if (
      refs.contentLanguage
    ) {
      refs.contentLanguage.value =
        SUPPORTED_LANGUAGES.includes(
          content.language
        )
          ? content.language
          : "en";
    }

    if (
      refs.contentCategory
    ) {
      refs.contentCategory.value =
        content.category ||
        "";
    }

    if (
      refs.contentStatus
    ) {
      refs.contentStatus.value =
        CONTENT_STATUSES.includes(
          content.status
        )
          ? content.status
          : "draft";
    }

    if (
      refs.contentDescriptionInput
    ) {
      refs.contentDescriptionInput.value =
        content.description ||
        "";
    }

    if (
      refs.contentTags
    ) {
      refs.contentTags.value =
        tagsToText(
          content.tags
        );
    }

    setEditingId(
      content.id
    );

    selectedFile =
      null;

    if (
      refs.contentFileInput
    ) {
      refs.contentFileInput.value =
        "";
    }

    renderSelectedFile();

    clearPreview();
  }


  /* ============================================================
     EDIT CONTENT
     ============================================================ */

  async function editContent(
    id
  ) {
    if (
      !id
    ) {
      setMessage(
        "Content ID is missing.",
        "error"
      );

      return null;
    }

    if (
      !isSupabaseReady()
    ) {
      setMessage(
        "Supabase connection is unavailable.",
        "error"
      );

      return null;
    }

    try {
      setMessage(
        "Loading content…"
      );

      const content =
        await getContentById(
          id
        );

      populateForm(
        content
      );

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
        "Echoes Admin: Edit load failed.",
        error
      );

      setMessage(
        error &&
        error.message
          ? error.message
          : "Unable to load content.",
        "error"
      );

      return null;
    }
  }


  /* ============================================================
     SAVE CONTENT
     ============================================================ */

  async function saveContent(
    statusOverride = null
  ) {
    if (
      saving
    ) {
      return null;
    }

    if (
      !isSupabaseReady()
    ) {
      setMessage(
        "Supabase connection is unavailable.",
        "error"
      );

      return null;
    }

    const user =
      getCurrentUser();

    if (
      !user ||
      !user.id
    ) {
      setMessage(
        "Administrator session is unavailable.",
        "error"
      );

      return null;
    }

    const formData =
      getFormData(
        statusOverride
      );

    const validationError =
      validateForm(
        formData
      );

    if (
      validationError
    ) {
      setMessage(
        validationError,
        "error"
      );

      return null;
    }

    if (
      selectedFile &&
      !isFileCompatibleWithType(
        selectedFile,
        formData.type
      )
    ) {
      setMessage(
        "The selected file does not match the selected content type.",
        "error"
      );

      return null;
    }

    const editingId =
      getEditingId();

    const editing =
      Boolean(
        editingId
      );

    let previousFilePath =
      null;

    let uploadedPath =
      null;

    let result =
      null;

    let cleanupWarning =
      false;

    setFormLoading(
      true
    );

    setMessage(
      editing
        ? "Updating content…"
        : "Creating content…"
    );

    try {
      if (
        editing
      ) {
        const existing =
          await getContentById(
            editingId
          );

        previousFilePath =
          existing.file_path ||
          null;
      }

      if (
        selectedFile
      ) {
        uploadedPath =
          await uploadFile(
            selectedFile,
            user.id
          );
      }

      if (
        editing
      ) {
        result =
          await updateContent(
            editingId,
            formData,
            uploadedPath !==
              null
              ? uploadedPath
              : undefined
          );
      } else {
        result =
          await insertContent(
            formData,
            uploadedPath,
            user.id
          );
      }

      /*
       * Database work has completed successfully.
       *
       * If a new media file replaced an old one, remove
       * the previous Storage object only after the database
       * operation has succeeded.
       */
      if (
        editing &&
        uploadedPath &&
        previousFilePath &&
        previousFilePath !==
          uploadedPath
      ) {
        try {
          await deleteStorageFile(
            previousFilePath
          );
        } catch (
          storageError
        ) {
          cleanupWarning =
            true;

          console.error(
            "Echoes Admin: Previous media cleanup failed.",
            storageError
          );
        }
      }

      /*
       * The form is cleared only after the complete
       * create/update operation has succeeded.
       *
       * clearForm() clears its own message by design,
       * therefore the final result message is written
       * AFTER clearForm().
       */
      clearForm();

      if (
        cleanupWarning
      ) {
        setMessage(
          "Content was saved, but the previous media file could not be removed.",
          "warning"
        );
      } else {
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
          content:
            result,
          editing
        }
      );

      return result;

    } catch (
      error
    ) {
      console.error(
        "Echoes Admin: Content save failed.",
        error
      );

      /*
       * If a file was uploaded but the database operation
       * failed, remove that newly uploaded orphan file.
       */
      if (
        uploadedPath
      ) {
        try {
          await deleteStorageFile(
            uploadedPath
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Echoes Admin: Failed to clean up uploaded media after save failure.",
            cleanupError
          );
        }
      }

      setMessage(
        error &&
        error.message
          ? error.message
          : "Unable to save content.",
        "error"
      );

      return null;

    } finally {
      setFormLoading(
        false
      );
    }
        }

    /* ============================================================
     DELETE CONTENT
     ============================================================ */

  async function deleteContent(
    id
  ) {
    if (
      !id
    ) {
      setMessage(
        "Content ID is missing.",
        "error"
      );

      return false;
    }

    if (
      !isSupabaseReady()
    ) {
      setMessage(
        "Supabase connection is unavailable.",
        "error"
      );

      return false;
    }

    const confirmed =
      window.confirm(
        "Delete this content permanently?"
      );

    if (
      !confirmed
    ) {
      return false;
    }

    const supabase =
      getSupabase();

    try {
      setMessage(
        "Deleting content…"
      );

      const content =
        await getContentById(
          id
        );

      const {
        error
      } =
        await supabase
          .from(
            "content_items"
          )
          .delete()
          .eq(
            "id",
            id
          );

      if (
        error
      ) {
        console.error(
          "Echoes Admin: Content delete failed.",
          error
        );

        throw new Error(
          "Unable to delete the content."
        );
      }

      let storageWarning =
        false;

      if (
        content.file_path
      ) {
        try {
          await deleteStorageFile(
            content.file_path
          );
        } catch (
          storageError
        ) {
          storageWarning =
            true;

          console.error(
            "Echoes Admin: Media cleanup after content deletion failed.",
            storageError
          );
        }
      }

      /*
       * If the deleted content was currently being edited,
       * clear the editor now that the record no longer exists.
       */
      if (
        getEditingId() ===
        id
      ) {
        clearForm();
      }

      if (
        storageWarning
      ) {
        setMessage(
          "Content was deleted, but its media file could not be removed.",
          "warning"
        );
      } else {
        setMessage(
          "Content deleted successfully.",
          "success"
        );
      }

      emit(
        "echoes:content-deleted",
        {
          content
        }
      );

      return true;

    } catch (
      error
    ) {
      console.error(
        "Echoes Admin: Content deletion failed.",
        error
      );

      setMessage(
        error &&
        error.message
          ? error.message
          : "Unable to delete content.",
        "error"
      );

      return false;
    }
  }


  /* ============================================================
     OPEN EDITOR
     ============================================================ */

  function openEditorSection() {
    emit(
      "echoes:navigate",
      {
        section:
          "contentSection"
      }
    );
  }


  /* ============================================================
     FILE INPUT
     ============================================================ */

  function handleFileInput(
    event
  ) {
    const files =
      event.target.files;

    if (
      !files ||
      !files.length
    ) {
      return;
    }

    setSelectedFile(
      files[0]
    );
  }


  /* ============================================================
     CHOOSE FILE
     ============================================================ */

  function handleChooseFile(
    event
  ) {
    if (
      event
    ) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (
      saving
    ) {
      return;
    }

    if (
      refs.contentFileInput
    ) {
      refs.contentFileInput.click();
    }
  }


  /* ============================================================
     DRAG OVER
     ============================================================ */

  function handleDragOver(
    event
  ) {
    event.preventDefault();

    if (
      saving
    ) {
      return;
    }

    if (
      refs.uploadZone
    ) {
      refs.uploadZone.classList.add(
        "is-dragover"
      );
    }
  }


  /* ============================================================
     DRAG LEAVE
     ============================================================ */

  function handleDragLeave(
    event
  ) {
    event.preventDefault();

    if (
      refs.uploadZone
    ) {
      refs.uploadZone.classList.remove(
        "is-dragover"
      );
    }
  }


  /* ============================================================
     DROP
     ============================================================ */

  function handleDrop(
    event
  ) {
    event.preventDefault();

    if (
      refs.uploadZone
    ) {
      refs.uploadZone.classList.remove(
        "is-dragover"
      );
    }

    if (
      saving
    ) {
      return;
    }

    const files =
      event.dataTransfer &&
      event.dataTransfer.files;

    if (
      !files ||
      !files.length
    ) {
      return;
    }

    setSelectedFile(
      files[0]
    );
  }


  /* ============================================================
     TYPE CHANGE
     ============================================================ */

  function handleTypeChange() {
    if (
      !selectedFile
    ) {
      return;
    }

    const data =
      getFormData();

    if (
      !isFileCompatibleWithType(
        selectedFile,
        data.type
      )
    ) {
      setMessage(
        "The current selected file does not match the new content type. Choose another file.",
        "warning"
      );

      return;
    }

    setMessage("");
  }


  /* ============================================================
     CLEAR BUTTON
     ============================================================ */

  function handleClear() {
    if (
      saving
    ) {
      return;
    }

    clearForm();

    setMessage(
      "Content form cleared.",
      "success"
    );
  }


  /* ============================================================
     SAVE DRAFT BUTTON
     ============================================================ */

  function handleSaveDraft(
    event
  ) {
    if (
      event
    ) {
      event.preventDefault();
    }

    saveContent(
      "draft"
    );
  }


  /* ============================================================
     PUBLISH BUTTON
     ============================================================ */

  function handlePublish(
    event
  ) {
    if (
      event
    ) {
      event.preventDefault();
    }

    saveContent(
      "published"
    );
  }


  /* ============================================================
     FORM SUBMIT
     ============================================================ */

  function handleFormSubmit(
    event
  ) {
    event.preventDefault();

    const status =
      refs.contentStatus
        ? refs.contentStatus.value
        : "draft";

    saveContent(
      status
    );
  }


  /* ============================================================
     CONTENT EDIT REQUEST
     ============================================================ */

  async function handleContentEditRequest(
    event
  ) {
    const id =
      event &&
      event.detail
        ? event.detail.id
        : null;

    if (
      !id
    ) {
      return;
    }

    openEditorSection();

    await editContent(
      id
    );
  }


  /* ============================================================
     CONTENT DELETE REQUEST
     ============================================================ */

  async function handleContentDeleteRequest(
    event
  ) {
    const id =
      event &&
      event.detail
        ? event.detail.id
        : null;

    if (
      !id
    ) {
      return;
    }

    await deleteContent(
      id
    );
  }


  /* ============================================================
     AUTH SIGNED OUT
     ============================================================ */

  function handleSignedOut() {
    clearForm();
  }


  /* ============================================================
     EVENT REGISTRATION
     ============================================================ */

  function registerEvents() {
    document.addEventListener(
      "echoes:content-edit-request",
      handleContentEditRequest
    );

    document.addEventListener(
      "echoes:content-delete-request",
      handleContentDeleteRequest
    );

    document.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );
  }


  /* ============================================================
     DOM EVENTS
     ============================================================ */

  function registerDomEvents() {
    if (
      refs.contentForm
    ) {
      refs.contentForm.addEventListener(
        "submit",
        handleFormSubmit
      );
    }

    if (
      refs.contentFileInput
    ) {
      refs.contentFileInput.addEventListener(
        "change",
        handleFileInput
      );
    }

    if (
      refs.chooseFileButton
    ) {
      refs.chooseFileButton.addEventListener(
        "click",
        handleChooseFile
      );
    }

    if (
      refs.uploadZone
    ) {
      refs.uploadZone.addEventListener(
        "dragover",
        handleDragOver
      );

      refs.uploadZone.addEventListener(
        "dragleave",
        handleDragLeave
      );

      refs.uploadZone.addEventListener(
        "drop",
        handleDrop
      );

      refs.uploadZone.addEventListener(
        "click",
        handleChooseFile
      );
    }

    if (
      refs.contentType
    ) {
      refs.contentType.addEventListener(
        "change",
        handleTypeChange
      );
    }

    if (
      refs.clearContentButton
    ) {
      refs.clearContentButton.addEventListener(
        "click",
        handleClear
      );
    }

    if (
      refs.saveDraftButton
    ) {
      refs.saveDraftButton.addEventListener(
        "click",
        handleSaveDraft
      );
    }

    if (
      refs.publishContentButton
    ) {
      refs.publishContentButton.addEventListener(
        "click",
        handlePublish
      );
    }
  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initializeContent() {
    if (
      initialized
    ) {
      return;
    }

    cacheDom();

    if (
      !refs.contentForm
    ) {
      console.error(
        "Echoes Admin: Content form was not found."
      );

      return;
    }

    registerEvents();

    registerDomEvents();

    resetFields();

    initialized =
      true;
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN_CONTENT = {
    save:
      saveContent,

    edit:
      editContent,

    remove:
      deleteContent,

    clear:
      clearForm,

    getCurrentContentId:
      getEditingId,

    getSelectedFile() {
      return selectedFile;
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

    getSupportedStatuses() {
      return [
        ...CONTENT_STATUSES
      ];
    },

    isSaving() {
      return saving;
    }
  };


  /* ============================================================
     STARTUP
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeContent,
      {
        once: true
      }
    );
  } else {
    initializeContent();
  }

})();

/*
 * ============================================================
 * END OF ECHOES OF HUMANITY — ADMIN CONTENT MANAGEMENT
 * ============================================================
 */
