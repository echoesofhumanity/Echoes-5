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

    function validateFile(file) {
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
            file.size < 0
        ) {
            throw new Error(
                "Admin V3 Media: Invalid file size."
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

        validateFile(file);

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
        isLoading,
        isUploading,
        getState
    };
})();
