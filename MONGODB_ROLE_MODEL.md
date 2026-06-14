# MongoDB Role Model

This project should use a single MongoDB database with role-based access control.

## Roles

- `super_admin`
- `admin`
- `staff`

## Core idea

- `super_admin` can access all factories and all data
- `admin` can access only the factory they belong to
- `staff` can access only the modules and records granted to them

## Collections

### `users`

Stores login identity and global access.

```ts
{
  _id: ObjectId,
  name: string,
  email: string,
  passwordHash?: string,
  googleId?: string,
  globalRole: "super_admin" | "admin" | "staff",
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique index on `email`
- unique sparse index on `googleId` if used

### `factories`

Represents each company/workspace.

```ts
{
  _id: ObjectId,
  name: string,
  code: string,
  status: "active" | "inactive",
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique index on `code`

### `memberships`

Connects a user to a factory with a role.

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  factoryId: ObjectId,
  role: "admin" | "staff",
  accessLevel: "view" | "edit" | "finance" | "full",
  employeeRole?: string,
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique compound index on `{ userId: 1, factoryId: 1 }`
- index on `{ factoryId: 1, role: 1 }`

### `staff`

Optional profile collection if you want staff details separate from login identity.

```ts
{
  _id: ObjectId,
  factoryId: ObjectId,
  userId?: ObjectId,
  name: string,
  email?: string,
  phone?: string,
  role: string,
  accessLevel: "view" | "edit" | "finance" | "full",
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Business collections

These should all include `factoryId` so data stays isolated per admin.

- `projects`
- `customers`
- `vendors`
- `stockItems`
- `transactions`
- `invoices`
- `notifications`
- `settings`

Example:

```ts
{
  _id: ObjectId,
  factoryId: ObjectId,
  name: string,
  status: string,
  createdAt: Date,
  updatedAt: Date
}
```

## Access rules

### `super_admin`

- Can read and write across all factories
- Can manage factories, billing, subscriptions, and system settings

### `admin`

- Can read and write only documents where `factoryId` matches their membership
- Can manage staff in their own factory

### `staff`

- Can access only allowed routes and actions
- Must be filtered by `factoryId`
- May be limited by `accessLevel`

## Backend flow

### Login

1. User signs in with Google or email/password.
2. Backend looks up the user in `users`.
3. Backend loads memberships for that user.
4. Backend returns:
   - token or session
   - user profile
   - global role
   - memberships
   - active factory

### Request authorization

Every protected request should:

1. Verify token/session
2. Resolve user
3. Resolve membership
4. Check `globalRole`
5. Apply `factoryId` filter unless user is `super_admin`

## Suggested middleware shape

```ts
function requireAuth(req, res, next) {
  // verify token and load req.user
}

function requireRole(...roles) {
  return (req, res, next) => {
    // block if req.user.globalRole or membership role is not allowed
  };
}

function scopeFactory(req, res, next) {
  // set req.factoryId from membership unless super_admin
}
```

## Query pattern

### Super admin

```ts
Project.find({})
```

### Admin

```ts
Project.find({ factoryId: req.factoryId })
```

### Staff

```ts
Project.find({
  factoryId: req.factoryId,
  assignedTo: req.user._id
})
```

## Recommended setup for this app

Keep one database and one auth system.

Do not create separate databases for `super_admin`, `admin`, and `staff`.
That would make reporting, permissions, backups, and maintenance harder.

Use:

- one MongoDB database
- one `users` collection
- one `memberships` collection
- one `factoryId` on every business document

## What to build next

- Mongoose models for `users`, `factories`, `memberships`, `staff`
- auth middleware for JWT
- factory scoping helper
- route guards for admin and staff dashboards
