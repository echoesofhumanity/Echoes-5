import { withSupabase } from "npm:@supabase/server@^1";

const MAX_SEARCH_LENGTH = 100;
const MAX_RESULTS = 50;
const MAX_PAGES = 10;
const USERS_PER_PAGE = 1000;

type RequestBody = {
  search?: string;
  page?: number;
};

type PublicUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_anonymous: boolean;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

function normalizeSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_SEARCH_LENGTH);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toPublicUser(
  user: Record<string, unknown>,
  roles: PublicUser["roles"],
): PublicUser {
  return {
    id: String(user.id),
    email: typeof user.email === "string" ? user.email : null,
    created_at: String(user.created_at ?? ""),
    last_sign_in_at:
      typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    email_confirmed_at:
      typeof user.email_confirmed_at === "string"
        ? user.email_confirmed_at
        : null,
    is_anonymous: user.is_anonymous === true,
    roles,
  };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 },
      );
    }

    const { data: isSuperAdmin, error: authorizationError } =
      await ctx.supabase.rpc("is_super_admin");

    if (authorizationError) {
      console.error("Authorization check failed:", authorizationError);
      return Response.json(
        { error: "Authorization check failed." },
        { status: 500 },
      );
    }

    if (isSuperAdmin !== true) {
      return Response.json(
        { error: "Super Admin access required." },
        { status: 403 },
      );
    }

    let body: RequestBody = {};

    try {
      body = await req.json();
    } catch {
      // Empty request body is treated as an empty search.
    }

    const search = normalizeSearch(body.search);
    const requestedPage =
      Number.isInteger(body.page) && Number(body.page) > 0
        ? Number(body.page)
        : 1;

    const users: Record<string, unknown>[] = [];

    if (search && isUuid(search)) {
      const { data, error } =
        await ctx.supabaseAdmin.auth.admin.getUserById(search);

      if (error) {
        console.error("Auth user lookup failed:", error);
        return Response.json(
          { error: "User lookup failed." },
          { status: 500 },
        );
      }

      if (data.user && data.user.is_anonymous !== true) {
        users.push(data.user as unknown as Record<string, unknown>);
      }
    } else {
      let page = search ? 1 : requestedPage;

      for (let iteration = 0; iteration < MAX_PAGES; iteration += 1) {
        const { data, error } =
          await ctx.supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: USERS_PER_PAGE,
          });

        if (error) {
          console.error("Auth user list failed:", error);
          return Response.json(
            { error: "User list failed." },
            { status: 500 },
          );
        }

        const batch = (data.users ?? []) as unknown as Record<
          string,
          unknown
        >[];

        for (const user of batch) {
          if (user.is_anonymous === true) continue;

          const email =
            typeof user.email === "string" ? user.email.toLowerCase() : "";
          const userId = typeof user.id === "string" ? user.id : "";

          if (!search || email.includes(search.toLowerCase()) || userId === search) {
            users.push(user);
            if (users.length >= MAX_RESULTS) break;
          }
        }

        if (users.length >= MAX_RESULTS || batch.length < USERS_PER_PAGE) {
          break;
        }

        page += 1;
      }
    }

    const userIds = users
      .map((user) => (typeof user.id === "string" ? user.id : ""))
      .filter(Boolean);

    const rolesByUser = new Map<string, PublicUser["roles"]>();

    if (userIds.length > 0) {
      const { data: assignments, error: assignmentsError } =
        await ctx.supabaseAdmin
          .from("admin_user_roles")
          .select("user_id, role_id")
          .in("user_id", userIds);

      if (assignmentsError) {
        console.error(
          "Admin role assignment lookup failed:",
          assignmentsError,
        );
        return Response.json(
          { error: "Administrator role assignment lookup failed." },
          { status: 500 },
        );
      }

      const roleIds = (assignments ?? [])
        .map((assignment) => assignment.role_id as string)
        .filter(Boolean);

      if (roleIds.length > 0) {
        const { data: roles, error: rolesError } =
          await ctx.supabaseAdmin
            .from("admin_roles")
            .select("id, name, slug")
            .in("id", roleIds);

        if (rolesError) {
          console.error("Admin role lookup failed:", rolesError);
          return Response.json(
            { error: "Administrator role lookup failed." },
            { status: 500 },
          );
        }

        const rolesById = new Map(
          (roles ?? []).map((role) => [
            String(role.id),
            {
              id: String(role.id),
              name: String(role.name),
              slug: String(role.slug),
            },
          ]),
        );

        for (const assignment of assignments ?? []) {
          const userId = assignment.user_id as string;
          const role = rolesById.get(String(assignment.role_id));

          if (!role) continue;

          const current = rolesByUser.get(userId) ?? [];
          current.push(role);
          rolesByUser.set(userId, current);
        }
      }
    }

    const result = users.map((user) =>
      toPublicUser(
        user,
        rolesByUser.get(String(user.id)) ?? [],
      )
    );

    return Response.json({
      users: result,
      count: result.length,
      page: search ? 1 : requestedPage,
    });
  }),
};
