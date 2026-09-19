(function () {
    "use strict";

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Categories: Supabase client is not available."
        );
        return;
    }

    const state = {
        items: [],
        currentItem: null,
        initialized: false,
        loading: false
    };

    function requireManagePermission() {
        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Categories: Permissions module is not available."
            );
        }

        if (
            !window.EchoesAdminPermissions.hasPermission(
                "content.manage"
            )
        ) {
            throw new Error(
                "Admin V3 Categories: Manage permission is required."
            );
        }
    }

    function validateCategoryData(data) {
        if (!data || typeof data !== "object") {
            throw new Error(
                "Admin V3 Categories: Category data is required."
            );
        }

        const name =
            typeof data.name === "string"
                ? data.name.trim()
                : "";

        const slug =
            typeof data.slug === "string"
                ? data.slug.trim()
                : "";

        if (!name) {
            throw new Error(
                "Admin V3 Categories: Category name is required."
            );
        }

        if (!slug) {
            throw new Error(
                "Admin V3 Categories: Category slug is required."
            );
        }

        if (
            data.parent_id &&
            data.id &&
            data.parent_id === data.id
        ) {
            throw new Error(
                "Admin V3 Categories: A category cannot be its own parent."
            );
        }

        return {
            name,
            slug,
            parent_id:
                data.parent_id || null,
            description:
                data.description || null,
            icon:
                data.icon || "folder"
        };
    }

    async function loadCategories() {
        state.loading = true;

        try {
            const {
                data,
                error
            } = await db
                .from("categories")
                .select(`
                    id,
                    name,
                    slug,
                    parent_id,
                    description,
                    icon,
                    created_at,
                    updated_at
                `)
                .order("name", {
                    ascending: true
                });

            if (error) {
                console.error(
                    "Admin V3 Categories: Failed to load categories.",
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

    async function getCategoryById(id) {
        if (!id) {
            throw new Error(
                "Admin V3 Categories: Category ID is required."
            );
        }

        const {
            data,
            error
        } = await db
            .from("categories")
            .select(`
                id,
                name,
                slug,
                parent_id,
                description,
                icon,
                created_at,
                updated_at
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error(
                "Admin V3 Categories: Failed to load category.",
                error
            );

            throw error;
        }

        state.currentItem = data;

        return data;
    }

    async function createCategory(data) {
        requireManagePermission();

        const category =
            validateCategoryData(data);

        const {
            data: created,
            error
        } = await db
            .from("categories")
            .insert(category)
            .select()
            .single();

        if (error) {
            console.error(
                "Admin V3 Categories: Failed to create category.",
                error
            );

            throw error;
        }

        state.currentItem = created;

        state.items = [
            ...state.items,
            created
        ].sort(function (a, b) {
            return a.name.localeCompare(
                b.name
            );
        });

        return created;
    }

    async function updateCategory(id, data) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Categories: Category ID is required."
            );
        }

        const category =
            validateCategoryData(
                Object.assign(
                    {},
                    data,
                    {
                        id
                    }
                )
            );

        const {
            data: updated,
            error
        } = await db
            .from("categories")
            .update(category)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error(
                "Admin V3 Categories: Failed to update category.",
                error
            );

            throw error;
        }

        state.currentItem = updated;

        state.items = state.items
            .map(function (item) {
                return item.id === id
                    ? updated
                    : item;
            })
            .sort(function (a, b) {
                return a.name.localeCompare(
                    b.name
                );
            });

        return updated;
    }

    async function deleteCategory(id) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Categories: Category ID is required."
            );
        }

        const {
            data: children,
            error: childrenError
        } = await db
            .from("categories")
            .select("id")
            .eq("parent_id", id);

        if (childrenError) {
            console.error(
                "Admin V3 Categories: Failed to check child categories.",
                childrenError
            );

            throw childrenError;
        }

        if (
            children &&
            children.length > 0
        ) {
            throw new Error(
                "Admin V3 Categories: Cannot delete a category that has child categories."
            );
        }

        const {
            error
        } = await db
            .from("categories")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(
                "Admin V3 Categories: Failed to delete category.",
                error
            );

            throw error;
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

    function getRootCategories() {
        return state.items.filter(
            function (item) {
                return !item.parent_id;
            }
        );
    }

    function getChildCategories(parentId) {
        if (!parentId) {
            return [];
        }

        return state.items.filter(
            function (item) {
                return item.parent_id === parentId;
            }
        );
    }

    function getChildrenCount(parentId) {
        if (!parentId) {
            return 0;
        }

        return state.items.filter(
            function (item) {
                return item.parent_id === parentId;
            }
        ).length;
    }

    function isLoading() {
        return state.loading;
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
                state.loading
        };
    }


    function getCategoryElement(id) {
        return document.getElementById(id);
    }

    function showCategoryMessage(message, type) {
        const element = getCategoryElement("categoryFormMessage");

        if (!element) {
            return;
        }

        element.textContent = message || "";
        element.className = "form-message";

        if (type) {
            element.classList.add(type);
        }
    }

    function setCategoryBusy(isBusy) {
        const saveButton = getCategoryElement("categorySaveButton");
        const cancelButton = getCategoryElement("categoryCancelButton");

        if (saveButton) {
            saveButton.disabled = Boolean(isBusy);
        }

        if (cancelButton) {
            cancelButton.disabled = Boolean(isBusy);
        }
    }

    function resetCategoryForm() {
        const form = getCategoryElement("categoryForm");

        if (!form) {
            return;
        }

        form.reset();

        const icon = getCategoryElement("categoryIcon");

        if (icon) {
            icon.value = "folder";
        }

        const parent = getCategoryElement("categoryParent");

        if (parent) {
            parent.value = "";
        }

        state.currentItem = null;

        const saveButton = getCategoryElement("categorySaveButton");
        const cancelButton = getCategoryElement("categoryCancelButton");

        if (saveButton) {
            saveButton.textContent = "Save Category";
        }

        if (cancelButton) {
            cancelButton.hidden = true;
        }
    }

    function fillCategoryForm(item) {
        if (!item) {
            return;
        }

        const name = getCategoryElement("categoryName");
        const slug = getCategoryElement("categorySlug");
        const parent = getCategoryElement("categoryParent");
        const description = getCategoryElement("categoryDescription");
        const icon = getCategoryElement("categoryIcon");

        if (name) {
            name.value = item.name || "";
        }

        if (slug) {
            slug.value = item.slug || "";
        }

        if (parent) {
            parent.value = item.parent_id || "";
        }

        if (description) {
            description.value = item.description || "";
        }

        if (icon) {
            icon.value = item.icon || "folder";
        }

        const saveButton = getCategoryElement("categorySaveButton");
        const cancelButton = getCategoryElement("categoryCancelButton");

        if (saveButton) {
            saveButton.textContent = "Save Changes";
        }

        if (cancelButton) {
            cancelButton.hidden = false;
        }
    }

    function renderParentOptions() {
        const select = getCategoryElement("categoryParent");

        if (!select) {
            return;
        }

        const currentId = state.currentItem
            ? state.currentItem.id
            : null;

        const previousValue = select.value;

        select.innerHTML = "";

        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "No parent";
        select.appendChild(emptyOption);

        state.items
            .filter(function (item) {
                return item.id !== currentId;
            })
            .sort(function (a, b) {
                return a.name.localeCompare(b.name);
            })
            .forEach(function (item) {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.name;
                select.appendChild(option);
            });

        if (
            previousValue &&
            state.items.some(function (item) {
                return item.id === previousValue &&
                    item.id !== currentId;
            })
        ) {
            select.value = previousValue;
        } else if (
            state.currentItem &&
            state.currentItem.parent_id
        ) {
            select.value = state.currentItem.parent_id;
        } else {
            select.value = "";
        }
    }

    function getParentName(parentId) {
        if (!parentId) {
            return "No parent";
        }

        const parent = state.items.find(function (item) {
            return item.id === parentId;
        });

        return parent ? parent.name : "Unknown";
    }

    function renderCategoryList() {
        const list = getCategoryElement("categoryList");

        if (!list) {
            return;
        }

        if (!state.items.length) {
            list.innerHTML =
                '<div class="library-empty">No categories found.</div>';
            return;
        }

        list.innerHTML = state.items
            .slice()
            .sort(function (a, b) {
                return a.name.localeCompare(b.name);
            })
            .map(function (item) {
                const childCount = getChildrenCount(item.id);

                return (
                    '<div class="library-item">' +
                        '<div class="library-item-main">' +
                            '<div class="library-item-title">' +
                                escapeCategoryHtml(item.name) +
                            '</div>' +
                            '<div class="library-item-meta">' +
                                'Slug: ' +
                                escapeCategoryHtml(item.slug) +
                                ' · Parent: ' +
                                escapeCategoryHtml(getParentName(item.parent_id)) +
                                ' · Children: ' +
                                childCount +
                            '</div>' +
                            '<div class="library-item-description">' +
                                escapeCategoryHtml(item.description || "No description") +
                            '</div>' +
                        '</div>' +
                        '<div class="library-item-actions">' +
                            '<button type="button" class="action-button" data-category-edit="' +
                                escapeCategoryHtml(item.id) +
                                '">Edit</button>' +
                            '<button type="button" class="action-button danger" data-category-delete="' +
                                escapeCategoryHtml(item.id) +
                                '">Delete</button>' +
                        '</div>' +
                    '</div>'
                );
            })
            .join("");
    }

    function escapeCategoryHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function readCategoryForm() {
        return {
            name: getCategoryElement("categoryName")
                ? getCategoryElement("categoryName").value
                : "",
            slug: getCategoryElement("categorySlug")
                ? getCategoryElement("categorySlug").value
                : "",
            parent_id: getCategoryElement("categoryParent")
                ? getCategoryElement("categoryParent").value || null
                : null,
            description: getCategoryElement("categoryDescription")
                ? getCategoryElement("categoryDescription").value
                : "",
            icon: getCategoryElement("categoryIcon")
                ? getCategoryElement("categoryIcon").value
                : "folder"
        };
    }

    async function handleCategorySubmit(event) {
        event.preventDefault();

        if (!window.EchoesAdminPermissions ||
            !window.EchoesAdminPermissions.hasPermission("content.manage")) {
            showCategoryMessage(
                "Manage permission is required.",
                "error"
            );
            return;
        }

        setCategoryBusy(true);
        showCategoryMessage("");

        try {
            const data = readCategoryForm();
            let saved;

            if (state.currentItem) {
                saved = await updateCategory(
                    state.currentItem.id,
                    data
                );

                showCategoryMessage(
                    "Category updated successfully.",
                    "success"
                );
            } else {
                saved = await createCategory(data);

                showCategoryMessage(
                    "Category created successfully.",
                    "success"
                );
            }

            await loadCategories();

            state.currentItem = saved;
            renderParentOptions();
            renderCategoryList();

            if (saved) {
                fillCategoryForm(saved);
            }
        } catch (error) {
            console.error(
                "Admin V3 Categories: Category save failed.",
                error
            );

            showCategoryMessage(
                error && error.message
                    ? error.message
                    : "Failed to save category.",
                "error"
            );
        } finally {
            setCategoryBusy(false);
        }
    }

    function handleCategoryListClick(event) {
        const editButton = event.target.closest(
            "[data-category-edit]"
        );

        if (editButton) {
            const item = state.items.find(function (category) {
                return category.id === editButton.dataset.categoryEdit;
            });

            if (item) {
                state.currentItem = item;
                renderParentOptions();
                fillCategoryForm(item);
                showCategoryMessage("");
            }

            return;
        }

        const deleteButton = event.target.closest(
            "[data-category-delete]"
        );

        if (!deleteButton) {
            return;
        }

        const item = state.items.find(function (category) {
            return category.id === deleteButton.dataset.categoryDelete;
        });

        if (!item) {
            return;
        }

        if (!window.confirm(
            'Delete category "' + item.name + '"?'
        )) {
            return;
        }

        handleCategoryDelete(item.id);
    }

    async function handleCategoryDelete(id) {
        setCategoryBusy(true);
        showCategoryMessage("");

        try {
            await deleteCategory(id);

            showCategoryMessage(
                "Category deleted successfully.",
                "success"
            );

            resetCategoryForm();
            await loadCategories();
            renderParentOptions();
            renderCategoryList();
        } catch (error) {
            console.error(
                "Admin V3 Categories: Category delete failed.",
                error
            );

            showCategoryMessage(
                error && error.message
                    ? error.message
                    : "Failed to delete category.",
                "error"
            );
        } finally {
            setCategoryBusy(false);
        }
    }

    function EchoesAdminCategoriesVisualStyle() {
        if (document.getElementById("echoes-admin-categories-visual-style")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "echoes-admin-categories-visual-style";
        style.textContent = `
            #module-categories .media-layout {
                grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
                gap: 20px;
            }

            #module-categories .panel {
                background: linear-gradient(
                    180deg,
                    rgba(17, 26, 43, 0.98) 0%,
                    rgba(14, 23, 39, 0.98) 100%
                );
                border-color: rgba(57, 198, 200, 0.16);
                box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
            }

            #module-categories .panel-title {
                margin-bottom: 20px;
                font-size: 19px;
                font-weight: 700;
                letter-spacing: -0.01em;
            }

            #module-categories .content-grid {
                gap: 18px;
            }

            #module-categories .field {
                gap: 8px;
            }

            #module-categories .field label {
                color: #a8b5c9;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }

            #module-categories .field input,
            #module-categories .field select,
            #module-categories .field textarea {
                padding: 12px 13px;
                border-radius: 10px;
                background: rgba(10, 19, 34, 0.88);
                border-color: #2a3a56;
                transition:
                    border-color 0.18s ease,
                    box-shadow 0.18s ease,
                    background 0.18s ease;
            }

            #module-categories .field input:focus,
            #module-categories .field select:focus,
            #module-categories .field textarea:focus {
                outline: none;
                border-color: rgba(57, 198, 200, 0.72);
                background: #0d1728;
                box-shadow: 0 0 0 3px rgba(57, 198, 200, 0.10);
            }

            #module-categories .field textarea {
                min-height: 112px;
                line-height: 1.55;
            }

            #module-categories .form-actions {
                margin-top: 20px;
                gap: 10px;
            }

            #module-categories .form-actions .action-button {
                min-height: 42px;
                padding: 10px 16px;
                border-radius: 10px;
                font-weight: 650;
            }

            #module-categories .form-actions .action-button.primary {
                box-shadow: 0 8px 20px rgba(57, 198, 200, 0.10);
            }

            #module-categories #categoryCancelButton {
                background: rgba(23, 34, 56, 0.72);
            }

            #module-categories #categoryList {
                gap: 12px;
            }

            #module-categories #categoryList .library-item {
                padding: 17px 18px;
                border-radius: 13px;
                background: linear-gradient(
                    145deg,
                    rgba(13, 23, 40, 0.98) 0%,
                    rgba(15, 27, 47, 0.92) 100%
                );
                border-color: #293954;
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
                transition:
                    transform 0.18s ease,
                    border-color 0.18s ease,
                    box-shadow 0.18s ease;
            }

            #module-categories #categoryList .library-item:hover {
                transform: translateY(-1px);
                border-color: rgba(57, 198, 200, 0.46);
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.20);
            }

            #module-categories #categoryList .library-item-main {
                min-width: 0;
            }

            #module-categories #categoryList .library-item-title {
                margin-bottom: 8px;
                color: #f4f7fb;
                font-size: 18px;
                font-weight: 700;
                line-height: 1.3;
                letter-spacing: -0.01em;
            }

            #module-categories #categoryList .library-item-meta {
                margin-top: 0;
                color: #91a0b8;
                font-size: 12px;
                line-height: 1.55;
            }

            #module-categories #categoryList .library-item-description {
                margin-top: 10px;
                color: #d9e0ea;
                font-size: 14px;
                line-height: 1.55;
            }

            #module-categories #categoryList .library-item-actions {
                margin-top: 15px;
                gap: 9px;
            }

            #module-categories #categoryList .library-item-actions .action-button {
                min-width: 104px;
                min-height: 40px;
                padding: 9px 14px;
                border-radius: 10px;
                font-weight: 650;
            }

            #module-categories #categoryList .library-item-actions .action-button:not(.danger) {
                background: rgba(23, 34, 56, 0.90);
                border-color: #2c3d5b;
            }

            #module-categories #categoryList .library-item-actions .action-button:not(.danger):hover {
                border-color: rgba(57, 198, 200, 0.58);
                color: #f4f7fb;
            }

            #module-categories #categoryList .library-item-actions .action-button.danger {
                background: rgba(40, 23, 28, 0.74);
                border-color: rgba(239, 100, 100, 0.34);
            }

            #module-categories #categoryList .library-item-actions .action-button.danger:hover {
                border-color: rgba(239, 100, 100, 0.62);
            }

            #module-categories #categoryFormMessage {
                line-height: 1.5;
            }

            @media (max-width: 1000px) {
                #module-categories .media-layout {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 800px) {
                #module-categories .panel {
                    padding: 20px;
                    border-radius: 14px;
                }

                #module-categories .content-grid {
                    gap: 14px;
                }

                #module-categories #categoryList .library-item {
                    padding: 16px;
                }

                #module-categories #categoryList .library-item-actions {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                #module-categories #categoryList .library-item-actions .action-button {
                    width: 100%;
                    min-width: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }

    async function initializeCategoryUI() {
        const form = getCategoryElement("categoryForm");
        const list = getCategoryElement("categoryList");
        const cancelButton = getCategoryElement("categoryCancelButton");

        if (!form || form.dataset.bound === "true") {
            return;
        }

        form.dataset.bound = "true";
        form.addEventListener("submit", handleCategorySubmit);

        if (list) {
            list.addEventListener(
                "click",
                handleCategoryListClick
            );
        }

        if (cancelButton) {
            cancelButton.addEventListener(
                "click",
                function () {
                    resetCategoryForm();
                    renderParentOptions();
                    showCategoryMessage("");
                }
            );
        }

        try {
            await loadCategories();
            renderParentOptions();
            renderCategoryList();
        } catch (error) {
            console.error(
                "Admin V3 Categories: Initial category load failed.",
                error
            );

            showCategoryMessage(
                error && error.message
                    ? error.message
                    : "Failed to load categories.",
                "error"
            );

            if (list) {
                list.innerHTML =
                    '<div class="library-empty">Failed to load categories.</div>';
            }
        }
    }

    document.addEventListener(
        "echoes-admin-ready",
        function () {
            initializeCategoryUI();
        }
    );

    document.addEventListener(
        "echoes-admin-module-change",
        function (event) {
            if (
                event.detail &&
                event.detail.moduleId === "categories"
            ) {
                initializeCategoryUI();
            }
        }
    );

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Categories: Permissions module is not available."
            );
        }

        state.initialized = true;

        return getState();
    }

    window.EchoesAdminCategories = {
        initialize,
        loadCategories,
        getCategoryById,
        createCategory,
        updateCategory,
        deleteCategory,
        setCurrentItem,
        getItems,
        getCurrentItem,
        getRootCategories,
        getChildCategories,
        getChildrenCount,
        isLoading,
        getState
    };
})();
