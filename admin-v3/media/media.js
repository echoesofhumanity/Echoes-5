(function () {
    "use strict";

    const db = window.db;

    const BUCKET_ID = "echoes-media";

    const MEDIA_TYPES = [
        "image",
        "video",
        "audio",
        "document",
        "other"
    ];

    const MEDIA_POLICY = {
        image: {
            maxBytes: 20 * 1024 * 1024,
            extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"],
            mimeTypes: [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
                "image/avif"
            ]
        },
        video: {
            maxBytes: 500 * 1024 * 1024,
            extensions: [".mp4", ".webm", ".mov"],
            mimeTypes: [
                "video/mp4",
                "video/webm",
                "video/quicktime"
            ]
        },
        audio: {
            maxBytes: 100 * 1024 * 1024,
            extensions: [".mp3", ".wav", ".ogg", ".m4a"],
            mimeTypes: [
                "audio/mpeg",
                "audio/wav",
                "audio/ogg",
                "audio/mp4",
                "audio/x-m4a"
            ]
        },
        document: {
            maxBytes: 50 * 1024 * 1024,
            extensions: [".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv"],
            mimeTypes: [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain",
                "text/csv"
            ]
        }
    };

    const state = {
        items: [],
        currentItem: null,
        initialized: false,
        loading: false,
        uploading: false
    };

    if (!db) {
        console.error(
            "Admin V3 Media: Supabase client is not available."
        );
        return;
    }

    function requirePermissionsModule() {
        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Media: Permissions module is not available."
            );
        }
    }

    function requireViewPermission() {
        requirePermissionsModule();

        if (
            !window.EchoesAdminPermissions.hasPermission(
                "media.view"
            )
        ) {
            throw new Error(
                "Admin V3 Media: View permission is required."
            );
        }
    }

    function requireManagePermission() {
        requirePermissionsModule();

        if (
            !window.EchoesAdminPermissions.hasPermission(
                "media.manage"
            )
        ) {
            throw new Error(
                "Admin V3 Media: Manage permission is required."
            );
        }
    }

    function validateMediaType(mediaType) {
        const value =
            typeof mediaType === "string"
                ? mediaType.trim().toLowerCase()
                : "other";

        if (!MEDIA_TYPES.includes(value)) {
            throw new Error(
                "Admin V3 Media: Invalid media type."
            );
        }

        return value;
    }

    function detectMediaType(mimeType) {
        if (
            typeof mimeType !== "string" ||
            !mimeType.trim()
        ) {
            return "other";
        }

        const value =
            mimeType.trim().toLowerCase();

        if (value.startsWith("image/")) {
            return "image";
        }

        if (value.startsWith("video/")) {
            return "video";
        }

        if (value.startsWith("audio/")) {
            return "audio";
        }

        if (
            value === "application/pdf" ||
            value.startsWith("text/") ||
            value.includes("document") ||
            value.includes("spreadsheet") ||
            value.includes("presentation") ||
            value.includes("word")
        ) {
            return "document";
        }

        return "other";
    }

    function getFileExtension(fileName) {
        const value =
            typeof fileName === "string"
                ? fileName.trim().toLowerCase()
                : "";

        const lastDot = value.lastIndexOf(".");

        return lastDot >= 0
            ? value.slice(lastDot)
            : "";
    }

    function getMediaPolicy(mediaType) {
        return MEDIA_POLICY[mediaType] || null;
    }

    function validateFile(file, requestedMediaType) {
        if (!file) {
            throw new Error(
                "Admin V3 Media: A file is required."
            );
        }

        if (
            typeof file.name !== "string" ||
            !file.name.trim()
        ) {
            throw new Error(
                "Admin V3 Media: File name is required."
            );
        }

        if (
            typeof file.size !== "number" ||
            !Number.isFinite(file.size) ||
            file.size < 0
        ) {
            throw new Error(
                "Admin V3 Media: Invalid file size."
            );
        }

        const mimeType =
            typeof file.type === "string"
                ? file.type.trim().toLowerCase()
                : "";

        if (!mimeType) {
            throw new Error(
                "Admin V3 Media: The file type could not be detected. Please choose a supported file."
            );
        }

        const detectedType =
            detectMediaType(mimeType);

        if (detectedType === "other") {
            throw new Error(
                "Admin V3 Media: This file format is not supported."
            );
        }

        if (
            requestedMediaType &&
            requestedMediaType !== "auto" &&
            requestedMediaType !== detectedType
        ) {
            throw new Error(
                "Admin V3 Media: The selected media type does not match the file type."
            );
        }

        const policy =
            getMediaPolicy(detectedType);

        if (!policy) {
            throw new Error(
                "Admin V3 Media: No upload policy exists for this file type."
            );
        }

        if (!policy.mimeTypes.includes(mimeType)) {
            throw new Error(
                "Admin V3 Media: This MIME type is not allowed."
            );
        }

        const extension =
            getFileExtension(file.name);

        if (
            !extension ||
            !policy.extensions.includes(extension)
        ) {
            throw new Error(
                "Admin V3 Media: This file extension is not allowed for the detected file type."
            );
        }

        if (file.size > policy.maxBytes) {
            const maxMb =
                policy.maxBytes / (1024 * 1024);

            throw new Error(
                "Admin V3 Media: File is too large. Maximum size for " +
                detectedType +
                " files is " +
                maxMb +
                " MB."
            );
        }

        return file;
    }

    function validateMetadata(data) {
        if (!data || typeof data !== "object") {
            throw new Error(
                "Admin V3 Media: Metadata is required."
            );
        }

        if (
            typeof data.storage_path !== "string" ||
            !data.storage_path.trim()
        ) {
            throw new Error(
                "Admin V3 Media: Storage path is required."
            );
        }

        if (
            typeof data.original_name !== "string" ||
            !data.original_name.trim()
        ) {
            throw new Error(
                "Admin V3 Media: Original file name is required."
            );
        }

        const mimeType =
            typeof data.mime_type === "string" &&
            data.mime_type.trim()
                ? data.mime_type.trim()
                : null;

        const mediaType =
            data.media_type
                ? validateMediaType(
                      data.media_type
                  )
                : detectMediaType(mimeType);

        return {
            bucket_id: BUCKET_ID,

            storage_path:
                data.storage_path.trim(),

            original_name:
                data.original_name.trim(),

            display_name:
                typeof data.display_name === "string" &&
                data.display_name.trim()
                    ? data.display_name.trim()
                    : null,

            mime_type:
                mimeType,

            file_size:
                typeof data.file_size === "number" &&
                data.file_size >= 0
                    ? data.file_size
                    : null,

            media_type:
                mediaType,

            title:
                typeof data.title === "string" &&
                data.title.trim()
                    ? data.title.trim()
                    : null,

            alt_text:
                typeof data.alt_text === "string" &&
                data.alt_text.trim()
                    ? data.alt_text.trim()
                    : null,

            description:
                typeof data.description === "string" &&
                data.description.trim()
                    ? data.description.trim()
                    : null,

            metadata:
                data.metadata &&
                typeof data.metadata === "object"
                    ? data.metadata
                    : {}
        };
    }

    function createStoragePath(fileName) {
        const safeName =
            String(fileName)
                .trim()
                .replace(
                    /[^a-zA-Z0-9._-]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                );

        const uniquePart =
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 10);

        return (
            "media/" +
            uniquePart +
            "-" +
            safeName
        );
    }

    async function loadMedia() {
        requireViewPermission();

        state.loading = true;

        try {
            const {
                data,
                error
            } = await db
                .from("media_assets")
                .select(`
                    id,
                    bucket_id,
                    storage_path,
                    original_name,
                    display_name,
                    mime_type,
                    file_size,
                    media_type,
                    title,
                    alt_text,
                    description,
                    metadata,
                    uploaded_by,
                    created_at,
                    updated_at
                `)
                .eq("bucket_id", BUCKET_ID)
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                console.error(
                    "Admin V3 Media: Failed to load media.",
                    error
                );

                throw error;
            }

            state.items = data || [];

            return getItems();
        } finally {
            state.loading = false;
        }
    }

    async function getMediaById(id) {
        requireViewPermission();

        if (!id) {
            throw new Error(
                "Admin V3 Media: Media ID is required."
            );
        }

        const {
            data,
            error
        } = await db
            .from("media_assets")
            .select(`
                id,
                bucket_id,
                storage_path,
                original_name,
                display_name,
                mime_type,
                file_size,
                media_type,
                title,
                alt_text,
                description,
                metadata,
                uploaded_by,
                created_at,
                updated_at
            `)
            .eq("id", id)
            .eq("bucket_id", BUCKET_ID)
            .single();

        if (error) {
            console.error(
                "Admin V3 Media: Failed to load media item.",
                error
            );

            throw error;
        }

        state.currentItem = data;

        return data;
    }

    async function uploadFile(file, metadata) {
        requireManagePermission();

        validateFile(
            file,
            metadata && metadata.media_type
                ? metadata.media_type
                : null
        );

        state.uploading = true;

        let storagePath = null;

        try {
            storagePath =
                createStoragePath(
                    file.name
                );

            const {
                error: uploadError
            } = await db.storage
                .from(BUCKET_ID)
                .upload(
                    storagePath,
                    file,
                    {
                        cacheControl:
                            "3600",
                        upsert: false,
                        contentType:
                            file.type || undefined
                    }
                );

            if (uploadError) {
                console.error(
                    "Admin V3 Media: Storage upload failed.",
                    uploadError
                );

                throw uploadError;
            }

            const normalizedMetadata =
                validateMetadata(
                    Object.assign(
                        {},
                        metadata || {},
                        {
                            storage_path:
                                storagePath,

                            original_name:
                                file.name,

                            mime_type:
                                file.type || null,

                            file_size:
                                file.size,

                            media_type:
                                metadata &&
                                metadata.media_type
                                    ? metadata.media_type
                                    : detectMediaType(
                                          file.type
                                      )
                        }
                    )
                );

            const {
                data: userData,
                error: userError
            } = await db.auth.getUser();

            if (userError) {
                throw userError;
            }

            normalizedMetadata.uploaded_by =
                userData &&
                userData.user
                    ? userData.user.id
                    : null;

            const {
                data: created,
                error: metadataError
            } = await db
                .from("media_assets")
                .insert(
                    normalizedMetadata
                )
                .select()
                .single();

            if (metadataError) {
                console.error(
                    "Admin V3 Media: Metadata creation failed.",
                    metadataError
                );

                await db.storage
                    .from(BUCKET_ID)
                    .remove([
                        storagePath
                    ]);

                throw metadataError;
            }

            state.currentItem =
                created;

            state.items = [
                created,
                ...state.items
            ];

            return created;
        } catch (error) {
            if (storagePath) {
                try {
                    await db.storage
                        .from(BUCKET_ID)
                        .remove([
                            storagePath
                        ]);
                } catch (cleanupError) {
                    console.error(
                        "Admin V3 Media: Storage cleanup failed.",
                        cleanupError
                    );
                }
            }

            throw error;
        } finally {
            state.uploading = false;
        }
    }

    async function updateMetadata(id, data) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Media: Media ID is required."
            );
        }

        if (!data || typeof data !== "object") {
            throw new Error(
                "Admin V3 Media: Metadata update data is required."
            );
        }

        const updates = {};

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "display_name"
            )
        ) {
            updates.display_name =
                data.display_name
                    ? String(
                          data.display_name
                      ).trim()
                    : null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "title"
            )
        ) {
            updates.title =
                data.title
                    ? String(
                          data.title
                      ).trim()
                    : null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "alt_text"
            )
        ) {
            updates.alt_text =
                data.alt_text
                    ? String(
                          data.alt_text
                      ).trim()
                    : null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "description"
            )
        ) {
            updates.description =
                data.description
                    ? String(
                          data.description
                      ).trim()
                    : null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "media_type"
            )
        ) {
            updates.media_type =
                validateMediaType(
                    data.media_type
                );
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                "metadata"
            )
        ) {
            updates.metadata =
                data.metadata &&
                typeof data.metadata === "object"
                    ? data.metadata
                    : {};
        }

        updates.updated_at =
            new Date().toISOString();

        const {
            data: updated,
            error
        } = await db
            .from("media_assets")
            .update(updates)
            .eq("id", id)
            .eq("bucket_id", BUCKET_ID)
            .select()
            .single();

        if (error) {
            console.error(
                "Admin V3 Media: Failed to update metadata.",
                error
            );

            throw error;
        }

        state.currentItem =
            updated;

        state.items =
            state.items.map(
                function (item) {
                    return item.id === id
                        ? updated
                        : item;
                }
            );

        return updated;
    }

    async function deleteMedia(id) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Media: Media ID is required."
            );
        }

        const {
            data: item,
            error: lookupError
        } = await db
            .from("media_assets")
            .select(`
                id,
                bucket_id,
                storage_path
            `)
            .eq("id", id)
            .eq("bucket_id", BUCKET_ID)
            .single();

        if (lookupError) {
            console.error(
                "Admin V3 Media: Failed to locate media item.",
                lookupError
            );

            throw lookupError;
        }

        const {
            error: storageError
        } = await db.storage
            .from(BUCKET_ID)
            .remove([
                item.storage_path
            ]);

        if (storageError) {
            console.error(
                "Admin V3 Media: Failed to delete storage object.",
                storageError
            );

            throw storageError;
        }

        const {
            error: metadataError
        } = await db
            .from("media_assets")
            .delete()
            .eq("id", id)
            .eq("bucket_id", BUCKET_ID);

        if (metadataError) {
            console.error(
                "Admin V3 Media: Failed to delete media metadata.",
                metadataError
            );

            throw metadataError;
        }

        state.items =
            state.items.filter(
                function (item) {
                    return item.id !== id;
                }
            );

        if (
            state.currentItem &&
            state.currentItem.id === id
        ) {
            state.currentItem = null;
        }

        return true;
    }

    async function listStorageObjects(prefix) {
        const storageObjects = [];
        const pageSize = 1000;
        let offset = 0;

        while (true) {
            const {
                data: objects,
                error: storageError
            } = await db.storage
                .from(BUCKET_ID)
                .list(prefix, {
                    limit: pageSize,
                    offset: offset,
                    sortBy: {
                        column: "name",
                        order: "asc"
                    }
                });

            if (storageError) {
                console.error(
                    "Admin V3 Media: Failed to list storage objects.",
                    storageError
                );
                throw storageError;
            }

            const page = objects || [];

            for (const object of page) {
                if (!object || !object.name) {
                    continue;
                }

                const objectPath = prefix
                    ? prefix + "/" + object.name
                    : object.name;

                if (object.id) {
                    storageObjects.push({
                        name: object.name,
                        storage_path: objectPath
                    });
                    continue;
                }

                const nestedObjects =
                    await listStorageObjects(objectPath);

                storageObjects.push(
                    ...nestedObjects
                );
            }

            if (page.length < pageSize) {
                break;
            }

            offset += pageSize;
        }

        return storageObjects;
    }

    async function checkIntegrity() {
        requireViewPermission();

        const {
            data: assets,
            error: assetsError
        } = await db
            .from("media_assets")
            .select("id, storage_path")
            .eq("bucket_id", BUCKET_ID);

        if (assetsError) {
            console.error(
                "Admin V3 Media: Failed to load media metadata for integrity check.",
                assetsError
            );
            throw assetsError;
        }

        const assetPaths = new Set(
            (assets || []).map(function (item) {
                return item.storage_path;
            })
        );

        const storageObjects =
            await listStorageObjects("media");

        const storagePaths = new Set(
            storageObjects.map(function (object) {
                return object.storage_path;
            })
        );

        const orphanStorageObjects =
            storageObjects.filter(function (object) {
                return !assetPaths.has(object.storage_path);
            });

        const orphanMetadata =
            (assets || []).filter(function (item) {
                return !storagePaths.has(item.storage_path);
            });

        return {
            storageObjects: storageObjects,
            mediaAssets: assets || [],
            orphanStorageObjects: orphanStorageObjects,
            orphanMetadata: orphanMetadata
        };
    }

    function setCurrentItem(item) {
        state.currentItem =
            item || null;

        return state.currentItem;
    }

    function getItems() {
        return state.items.slice();
    }

    function getCurrentItem() {
        return state.currentItem;
    }

    function getMediaTypes() {
        return MEDIA_TYPES.slice();
    }

    function isLoading() {
        return state.loading;
    }

    function isUploading() {
        return state.uploading;
    }

    function getState() {
        return {
            items:
                state.items.slice(),

            currentItem:
                state.currentItem,

            initialized:
                state.initialized,

            loading:
                state.loading,

            uploading:
                state.uploading
        };
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        requirePermissionsModule();

        state.initialized = true;

        return getState();
    }


    function getMediaElement(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatFileSize(bytes) {
        if (typeof bytes !== "number" || bytes < 0) {
            return "—";
        }

        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }

        if (bytes < 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(1) + " MB";
        }

        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }

    function showMediaMessage(message, isError) {
        const element = getMediaElement("mediaFormMessage");

        if (!element) {
            return;
        }

        element.textContent = message || "";
        element.classList.toggle("error", Boolean(isError));
        element.classList.toggle("success", !isError && Boolean(message));
    }

    function setMediaBusy(busy) {
        [
            "mediaUploadButton",
            "mediaSaveButton",
            "mediaDeleteButton"
        ].forEach(function (id) {
            const element = getMediaElement(id);

            if (element) {
                element.disabled = busy;
            }
        });
    }

    function resetMediaForm() {
        const form = getMediaElement("mediaForm");

        if (form) {
            form.reset();
        }

        const type = getMediaElement("mediaType");

        if (type) {
            type.value = "auto";
        }

        setCurrentItem(null);
        showMediaMessage("");
        const selected = getMediaElement("mediaSelectedName");

        if (selected) {
            selected.textContent = "No media selected";
        }

        const deleteButton = getMediaElement("mediaDeleteButton");

        if (deleteButton) {
            deleteButton.disabled = true;
        }

        const saveButton = getMediaElement("mediaSaveButton");

        if (saveButton) {
            saveButton.disabled = true;
        }
    }

    function fillMediaForm(item) {
        const values = {
            mediaDisplayName: item.display_name || "",
            mediaTitle: item.title || "",
            mediaAltText: item.alt_text || "",
            mediaDescription: item.description || ""
        };

        Object.keys(values).forEach(function (id) {
            const element = getMediaElement(id);

            if (element) {
                element.value = values[id];
            }
        });

        const type = getMediaElement("mediaType");

        if (type) {
            type.value = item.media_type || "other";
        }

        const selected = getMediaElement("mediaSelectedName");

        if (selected) {
            selected.textContent =
                item.original_name || "Selected media";
        }

        const saveButton = getMediaElement("mediaSaveButton");

        if (saveButton) {
            saveButton.disabled = false;
        }

        const deleteButton = getMediaElement("mediaDeleteButton");

        if (deleteButton) {
            deleteButton.disabled = false;
        }
    }

    function renderMediaList() {
        const container = getMediaElement("mediaList");

        if (!container) {
            return;
        }

        const items = getItems();

        if (items.length === 0) {
            container.innerHTML =
                '<div class="media-empty">No media assets found.</div>';
            return;
        }

        container.innerHTML = items.map(function (item) {
            const selected =
                getCurrentItem() &&
                getCurrentItem().id === item.id;

            return (
                '<button type="button" class="media-item' +
                (selected ? ' selected' : '') +
                '" data-media-id="' + escapeHtml(item.id) + '">' +
                    '<span class="media-item-main">' +
                        '<strong>' +
                            escapeHtml(
                                item.display_name ||
                                item.title ||
                                item.original_name
                            ) +
                        '</strong>' +
                        '<span>' +
                            escapeHtml(item.media_type || "other") +
                            ' · ' +
                            escapeHtml(formatFileSize(item.file_size)) +
                        '</span>' +
                    '</span>' +
                    '<span class="media-item-name">' +
                        escapeHtml(item.original_name) +
                    '</span>' +
                '</button>'
            );
        }).join("");

        container.querySelectorAll("[data-media-id]").forEach(
            function (element) {
                element.addEventListener("click", async function () {
                    const id = element.getAttribute("data-media-id");

                    try {
                        const item = await getMediaById(id);
                        fillMediaForm(item);
                        renderMediaList();
                        showMediaMessage("");
                    } catch (error) {
                        showMediaMessage(
                            error && error.message
                                ? error.message
                                : String(error),
                            true
                        );
                    }
                });
            }
        );
    }

    function readMediaMetadata() {
        const type = getMediaElement("mediaType");

        return {
            media_type:
                type && type.value !== "auto"
                    ? type.value
                    : undefined,
            display_name:
                getMediaElement("mediaDisplayName")?.value || "",
            title:
                getMediaElement("mediaTitle")?.value || "",
            alt_text:
                getMediaElement("mediaAltText")?.value || "",
            description:
                getMediaElement("mediaDescription")?.value || ""
        };
    }

    async function handleMediaUpload() {
        const input = getMediaElement("mediaFile");

        if (!input || !input.files || !input.files[0]) {
            showMediaMessage("Please select a file first.", true);
            return;
        }

        setMediaBusy(true);
        showMediaMessage("Uploading media...");

        try {
            const created = await uploadFile(
                input.files[0],
                readMediaMetadata()
            );

            fillMediaForm(created);
            input.value = "";
            renderMediaList();
            showMediaMessage("Media uploaded successfully.");
        } catch (error) {
            showMediaMessage(
                error && error.message
                    ? error.message
                    : String(error),
                true
            );
        } finally {
            setMediaBusy(false);

            const selected = getCurrentItem();

            const saveButton = getMediaElement("mediaSaveButton");
            const deleteButton = getMediaElement("mediaDeleteButton");

            if (saveButton) {
                saveButton.disabled = !selected;
            }

            if (deleteButton) {
                deleteButton.disabled = !selected;
            }
        }
    }

    async function handleMediaSave() {
        const item = getCurrentItem();

        if (!item) {
            showMediaMessage("Select a media asset first.", true);
            return;
        }

        setMediaBusy(true);
        showMediaMessage("Saving metadata...");

        try {
            const updated = await updateMetadata(
                item.id,
                readMediaMetadata()
            );

            fillMediaForm(updated);
            renderMediaList();
            showMediaMessage("Metadata saved successfully.");
        } catch (error) {
            showMediaMessage(
                error && error.message
                    ? error.message
                    : String(error),
                true
            );
        } finally {
            setMediaBusy(false);
        }
    }

    async function handleMediaDelete() {
        const item = getCurrentItem();

        if (!item) {
            showMediaMessage("Select a media asset first.", true);
            return;
        }

        const confirmed = window.confirm(
            "Delete this media asset from Echoes of Humanity?"
        );

        if (!confirmed) {
            return;
        }

        setMediaBusy(true);
        showMediaMessage("Deleting media...");

        try {
            await deleteMedia(item.id);
            resetMediaForm();
            renderMediaList();
            showMediaMessage("Media deleted successfully.");
        } catch (error) {
            showMediaMessage(
                error && error.message
                    ? error.message
                    : String(error),
                true
            );
        } finally {
            setMediaBusy(false);
        }
    }

    function bindMediaDropzone() {
        const dropzone = getMediaElement("mediaDropzone");
        const input = getMediaElement("mediaFile");

        if (!dropzone || !input) {
            return;
        }

        ["dragenter", "dragover"].forEach(function (eventName) {
            dropzone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropzone.classList.add("dragging");
            });
        });

        ["dragleave", "drop"].forEach(function (eventName) {
            dropzone.addEventListener(eventName, function (event) {
                event.preventDefault();
                dropzone.classList.remove("dragging");
            });
        });

        dropzone.addEventListener("drop", function (event) {
            const files = event.dataTransfer &&
                event.dataTransfer.files;

            if (files && files.length) {
                input.files = files;
                const name = getMediaElement("mediaSelectedFile");

                if (name) {
                    name.textContent = files[0].name;
                }
            }
        });

        input.addEventListener("change", function () {
            const name = getMediaElement("mediaSelectedFile");

            if (name) {
                name.textContent =
                    input.files && input.files[0]
                        ? input.files[0].name
                        : "No file selected";
            }
        });
    }

    function escapeIntegrityText(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderIntegrityResults(result) {
        const container =
            getMediaElement("mediaIntegrityResults");

        if (!container) {
            return;
        }

        const storageOrphans =
            result.orphanStorageObjects || [];

        const metadataOrphans =
            result.orphanMetadata || [];

        if (
            storageOrphans.length === 0 &&
            metadataOrphans.length === 0
        ) {
            container.hidden = false;
            container.innerHTML =
                "<strong>Integrity status</strong>" +
                "<p>No orphan objects or metadata records found.</p>";
            return;
        }

        let html =
            "<strong>Integrity findings</strong>";

        if (storageOrphans.length > 0) {
            html += "<p>Orphan storage objects:</p><ul>";

            storageOrphans.forEach(function (item) {
                html +=
                    "<li>" +
                    escapeIntegrityText(
                        item.storage_path
                    ) +
                    "</li>";
            });

            html += "</ul>";
        }

        if (metadataOrphans.length > 0) {
            html += "<p>Orphan metadata records:</p><ul>";

            metadataOrphans.forEach(function (item) {
                html +=
                    "<li>" +
                    escapeIntegrityText(
                        item.storage_path
                    ) +
                    "</li>";
            });

            html += "</ul>";
        }

        container.hidden = false;
        container.innerHTML = html;
    }

    async function handleMediaIntegrity() {
        setMediaBusy(true);
        showMediaMessage("Checking media integrity...");

        try {
            const result = await checkIntegrity();

            renderIntegrityResults(result);

            showMediaMessage(
                "Integrity check complete. " +
                result.orphanStorageObjects.length +
                " orphan storage object(s), " +
                result.orphanMetadata.length +
                " orphan metadata record(s)."
            );
        } catch (error) {
            showMediaMessage(
                error && error.message
                    ? error.message
                    : String(error),
                true
            );
        } finally {
            setMediaBusy(false);
        }
    }

    function bindMediaUI() {
        const form = getMediaElement("mediaForm");

        if (!form || form.dataset.bound === "true") {
            return;
        }

        form.dataset.bound = "true";

        const uploadButton = getMediaElement("mediaUploadButton");
        const saveButton = getMediaElement("mediaSaveButton");
        const deleteButton = getMediaElement("mediaDeleteButton");
        const integrityButton = getMediaElement("mediaIntegrityButton");

        if (uploadButton) {
            uploadButton.addEventListener(
                "click",
                handleMediaUpload
            );
        }

        if (saveButton) {
            saveButton.addEventListener(
                "click",
                handleMediaSave
            );
            saveButton.disabled = true;
        }

        if (deleteButton) {
            deleteButton.addEventListener(
                "click",
                handleMediaDelete
            );
            deleteButton.disabled = true;
        }

        if (integrityButton) {
            integrityButton.addEventListener(
                "click",
                handleMediaIntegrity
            );
        }

        bindMediaDropzone();
    }

    async function initializeMediaUI() {
        bindMediaUI();
        renderMediaList();

        try {
            await initialize();
            await loadMedia();
            renderMediaList();
        } catch (error) {
            showMediaMessage(
                error && error.message
                    ? error.message
                    : String(error),
                true
            );
        }
    }

    window.EchoesAdminMedia = {
        initialize,
        loadMedia,
        getMediaById,
        uploadFile,
        updateMetadata,
        deleteMedia,
        setCurrentItem,
        getItems,
        getCurrentItem,
        getMediaTypes,
        checkIntegrity,
        isLoading,
        isUploading,
        getState
    };

    document.addEventListener(
        "echoes-admin-ready",
        function () {
            initializeMediaUI();
        }
    );

    document.addEventListener(
        "echoes-admin-module-change",
        function (event) {
            if (
                event.detail &&
                event.detail.moduleId === "media"
            ) {
                initializeMediaUI();
            }
        }
    );

})();
