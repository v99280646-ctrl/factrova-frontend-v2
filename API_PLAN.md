# API Plan

This app should use one MongoDB-backed backend with a clean route layout and role-aware authorization.

## Base rules

- Base URL: `http://localhost:4000/api/v1`
- All protected requests require auth
- Factory-scoped data must always include `factoryId`
- `super_admin` bypasses factory scoping
- `admin` is limited to their factory
- `staff` is limited by membership permissions and assigned modules

## Response shape

Use one consistent JSON envelope.

```ts
{
  success: boolean,
  data: unknown,
  message?: string
}
```

## Auth routes

### `POST /auth/google`

Google login.

Request:

```ts
{
  credential: string
}
```

Response:

```ts
{
  token: string,
  profile: {
    id: string,
    name: string,
    email: string,
    globalRole: "super_admin" | "admin" | "staff"
  },
  memberships: Array<{
    factoryId: string,
    role: "admin" | "staff",
    accessLevel: string
  }>,
  primaryRole: "super_admin" | "admin" | "staff"
}
```

### `GET /auth/me`

Returns current session and memberships.

### `POST /auth/logout`

Invalidates session or client token.

## Super admin routes

### `GET /admin/factories`

List all factories.

### `POST /admin/factories`

Create a factory.

### `PATCH /admin/factories/:id`

Update a factory.

### `GET /admin/dashboard/summary`

Global metrics for the super admin dashboard.

## Factory admin routes

These are scoped by `factoryId`.

### `GET /factories/:factoryId/admin-profile`

Get admin profile/settings for a factory.

### `PATCH /factories/:factoryId/admin-profile`

Update admin profile/settings for a factory.

### `GET /factories/:factoryId/settings`

Fetch factory settings.

### `PATCH /factories/:factoryId/settings`

Update factory settings.

## Resource routes

All of these should support the standard CRUD pattern.

- `GET /projects`
- `GET /projects/:id`
- `POST /projects`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

Repeat the same pattern for:

- `customers`
- `vendors`
- `staff`
- `stock-items`
- `transactions`
- `invoices`
- `services`
- `notifications`
- `waste-materials`

## Recommended filtering

### `GET /projects`

- `super_admin` can query all projects
- `admin` automatically gets `factoryId = req.factoryId`
- `staff` gets `factoryId = req.factoryId` and optionally more filters

### `GET /staff`

- `super_admin` can view all staff
- `admin` can view staff in their factory
- `staff` can only view limited profile information if allowed

## Middleware plan

### `requireAuth`

Verifies token and loads the user.

### `requireRole`

Checks global role or membership role.

### `attachFactoryScope`

Sets `req.factoryId` for admin/staff requests.

### `allowModule`

Checks access level for sensitive actions like finance or settings.

## Folder layout suggestion

```txt
src/
  modules/
    auth/
    users/
    factories/
    memberships/
    projects/
    staff/
    stock/
    finance/
    settings/
```

Each module should contain:

- `model`
- `controller`
- `service`
- `routes`
- `validator`

## Cleanup goals

- Keep one request helper on the frontend
- Keep one auth response format
- Remove duplicate route-specific fetch logic
- Keep route names consistent: lowercase, kebab-case, or a single convention
- Keep role checks in backend middleware, not just the UI
