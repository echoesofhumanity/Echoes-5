/* =========================================================
   ECHOES OF HUMANITY
   ADMIN CONTENT LAYER
   Content creation + Storage upload + Database insert
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabaseClient =
    window.ECHOES_SUPABASE;


  /* =======================================================
     DOM
     ======================================================= */

  const contentForm =
    document.getElementById("contentForm");

  const contentTitle =
    document.getElementById("contentTitle");

  const contentType =
    document.getElementById("contentType");

  const contentLanguage =
    document.getElementById("contentLanguage");

  const contentCategory =
    document.getElementById("contentCategory");

  const contentDescription =
    document.getElementById("contentDescription");

  const contentTags =
    document.getElementById("contentTags");

  const uploadZone =
    document.getElementById("uploadZone");

  const fileInput =
    document.getElementById("fileInput");

  const preview =
    document.getElementById("preview");

  const previewContent =
    document.getElementById("previewContent");

  const contentMessage =
    document.getElementById("contentMessage");

  const clearButton =
    document.getElementById("clearButton");

  const saveDraftButton =
    document.getElementById("saveDraftButton");

  const publishButton =
    document.getElementById("publishButton");


  /* =======================================================
     STATE
     ======================================================= */

  let selectedFile = null;


  /* =======================================================
     MESSAGES
     ======================================================= */

  function showMessage(
    message,
    type = "error"
  ) {
    if (!contentMessage) {
      return;
    }

    contentMessage.textContent =
      message;

    contentMessage.className =
      `admin-message admin-message-${type} is-visible`;
  }


  function clearMessage() {
    if (!contentMessage) {
      return;
    }

    contentMessage.textContent = "";

    contentMessage.className =
      "admin-message";
  }


  /* =======================================================
     FILE HELPERS
     ======================================================= */

  function sanitizeFileName(
    fileName
  ) {
    return fileName
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .toLowerCase();
  }


  function createStoragePath(
    userId,
    file
  ) {
    const safeName =
      sanitizeFileName(
        file.name
      );

    const uniqueId =
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    return [
      "media",
      userId,
      `${uniqueId}-${safeName}`
    ].join("/");
  }


  /* =======================================================
     PREVIEW
     ======================================================= */

  function clearPreview() {
    selectedFile = null;

    if (previewContent) {
      previewContent.innerHTML = "";
    }

    if (preview) {
      preview.classList.remove(
        "is-visible"
      );
    }
  }


  function renderPreview(
    file
  ) {
    if (
      !previewContent ||
      !preview
    ) {
      return;
    }

    previewContent.innerHTML = "";

    const url =
      URL.createObjectURL(file);

    if (
      file.type.startsWith("image/")
    ) {
      const image =
        document.createElement("img");

      image.src = url;
      image.alt = file.name;

      previewContent.appendChild(
        image
      );

    } else if (
      file.type.startsWith("video/")
    ) {
      const video =
        document.createElement("video");

      video.src = url;
      video.controls = true;

      previewContent.appendChild(
        video
      );

    } else if (
      file.type.startsWith("audio/")
    ) {
      const audio =
        document.createElement("audio");

      audio.src = url;
      audio.controls = true;

      previewContent.appendChild(
        audio
      );

    } else {
      const text =
        document.createElement("div");

      text.textContent =
        `Selected file: ${file.name}`;

      previewContent.appendChild(
        text
      );
    }

    preview.classList.add(
      "is-visible"
    );
  }


  function handleFile(
    file
  ) {
    if (!file) {
      return;
    }

    selectedFile = file;

    clearMessage();

    renderPreview(
      file
    );
  }


  /* =======================================================
     FORM DATA
     ======================================================= */

  function getFormData(
    status
  ) {
    const tags =
      contentTags &&
      contentTags.value
        ? contentTags.value
            .split(",")
            .map(
              tag =>
                tag.trim()
            )
            .filter(Boolean)
        : [];

    return {
      title:
        contentTitle
          ? contentTitle.value.trim()
          : "",

      type:
        contentType
          ? contentType.value
          : "",

      language:
        contentLanguage
          ? contentLanguage.value
          : "",

      category:
        contentCategory
          ? contentCategory.value.trim()
          : null,

      description:
        contentDescription
          ? contentDescription.value.trim()
          : null,

      tags,

      status
    };
  }


  /* =======================================================
     VALIDATION
     ======================================================= */

  function validateForm(
    data
  ) {
    if (!data.title) {
      return "Please enter a title.";
    }

    if (!data.type) {
      return "Please select a content type.";
    }

    if (!data.language) {
      return "Please select a language.";
    }

    return null;
  }


  /* =======================================================
     BUTTON STATE
     ======================================================= */

  function setSavingState(
    isSaving
  ) {
    if (saveDraftButton) {
      saveDraftButton.disabled =
        isSaving;

      saveDraftButton.textContent =
        isSaving
          ? "Saving..."
          : "Save Draft";
    }

    if (publishButton) {
      publishButton.disabled =
        isSaving;

      publishButton.textContent =
        isSaving
          ? "Publishing..."
          : "Publish";
    }

    if (clearButton) {
      clearButton.disabled =
        isSaving;
    }
  }


  /* =======================================================
     STORAGE UPLOAD
     ======================================================= */

  async function uploadFile(
    file,
    userId
  ) {
    if (!file) {
      return null;
    }

    const filePath =
      createStoragePath(
        userId,
        file
      );

    const {
      error
    } = await supabaseClient
      .storage
      .from("echoes-media")
      .upload(
        filePath,
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
      throw error;
    }

    return filePath;
  }


  /* =======================================================
     DATABASE INSERT
     ======================================================= */

  async function createContentItem(
    data,
    filePath,
    userId
  ) {
    const payload = {
      title:
        data.title,

      type:
        data.type,

      language:
        data.language,

      category:
        data.category,

      description:
        data.description,

      tags:
        data.tags,

      file_path:
        filePath,

      status:
        data.status,

      author_id:
        userId,

      published_at:
        data.status === "published"
          ? new Date().toISOString()
          : null
    };

    const {
      data: item,
      error
    } = await supabaseClient
      .from("content_items")
      .insert(
        payload
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return item;
  }


  /* =======================================================
     SAVE CONTENT
     ======================================================= */

  async function saveContent(
    status
  ) {
    clearMessage();

    if (!supabaseClient) {
      showMessage(
        "Supabase connection is unavailable."
      );

      return;
    }

    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      showMessage(
        "Your administrator session has expired."
      );

      return;
    }

    const formData =
      getFormData(
        status
      );

    const validationError =
      validateForm(
        formData
      );

    if (validationError) {
      showMessage(
        validationError
      );

      return;
    }

    setSavingState(
      true
    );

    let uploadedPath = null;

    try {

      if (selectedFile) {
        uploadedPath =
          await uploadFile(
            selectedFile,
            user.id
          );
      }


      await createContentItem(
        formData,
        uploadedPath,
        user.id
      );


      showMessage(
        status === "published"
          ? "Content published successfully."
          : "Draft saved successfully.",
        "success"
      );


      if (
        window.EchoesAdminData
      ) {
        await window.EchoesAdminData
          .refreshDashboard();
      }


      clearForm(
        false
      );

    } catch (error) {

      console.error(
        "Content save failed:",
        error
      );


      /*
       * If Storage upload succeeded but
       * database creation failed, remove
       * the orphaned file.
       */

      if (uploadedPath) {
        try {
          await supabaseClient
            .storage
            .from("echoes-media")
            .remove([
              uploadedPath
            ]);
        } catch (
          cleanupError
        ) {
          console.error(
            "Storage cleanup failed:",
            cleanupError
          );
        }
      }


      showMessage(
        "Content could not be saved. Please try again."
      );

    } finally {

      setSavingState(
        false
      );
    }
  }


  /* =======================================================
     CLEAR FORM
     ======================================================= */

  function clearForm(
    clearMessageState = true
  ) {
    if (contentForm) {
      contentForm.reset();
    }

    clearPreview();

    if (
      clearMessageState
    ) {
      clearMessage();
    }
  }


  /* =======================================================
     EVENTS
     ======================================================= */

  if (uploadZone) {

    uploadZone.addEventListener(
      "click",
      () => {
        if (fileInput) {
          fileInput.click();
        }
      }
    );


    uploadZone.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          if (fileInput) {
            fileInput.click();
          }
        }
      }
    );


    uploadZone.addEventListener(
      "dragover",
      event => {
        event.preventDefault();
      }
    );


    uploadZone.addEventListener(
      "drop",
      event => {
        event.preventDefault();

        const file =
          event.dataTransfer &&
          event.dataTransfer.files
            ? event.dataTransfer.files[0]
            : null;

        handleFile(
          file
        );
      }
    );
  }


  if (fileInput) {
    fileInput.addEventListener(
      "change",
      event => {
        const file =
          event.target.files &&
          event.target.files[0]
            ? event.target.files[0]
            : null;

        handleFile(
          file
        );
      }
    );
  }


  if (clearButton) {
    clearButton.addEventListener(
      "click",
      () => {
        clearForm();
      }
    );
  }


  if (saveDraftButton) {
    saveDraftButton.addEventListener(
      "click",
      () => {
        saveContent(
          "draft"
        );
      }
    );
  }


  if (publishButton) {
    publishButton.addEventListener(
      "click",
      () => {
        saveContent(
          "published"
        );
      }
    );
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.EchoesAdminContent = {
    saveContent,
    clearForm
  };

})();
