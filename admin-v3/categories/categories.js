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
