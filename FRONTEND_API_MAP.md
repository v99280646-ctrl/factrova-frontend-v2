# Frontend To API Map

This file maps the current frontend screens to the backend endpoints they should use.

## Auth

- `src/routes/index.tsx`
  - `POST /auth/google`
  - `GET /auth/me`
  - `POST /auth/logout`

## Super admin

- `src/routes/Superadmin.tsx`
  - `GET /admin/dashboard/summary`

- `src/routes/Superadmin.factories.tsx`
  - `GET /admin/factories`
  - `GET /factories/:id`
  - `PATCH /factories/:id`

- `src/routes/Superadmin.payments.tsx`
  - `GET /admin/dashboard/summary`

- `src/routes/Superadmin.subscriptions.tsx`
  - `GET /admin/dashboard/summary`

- `src/routes/Superadmin.settings.tsx`
  - platform-level settings endpoint when implemented

## Factory admin

- `src/routes/dashboard.settings.tsx`
  - `GET /factories/:factoryId/settings`
  - `PUT /factories/:factoryId/settings`
  - `POST /factories/:factoryId/admin-profile`

- `src/routes/dashboard.staff.tsx`
  - `GET /staff`
  - `POST /staff`
  - `PATCH /staff/:id`
  - `DELETE /staff/:id`

- `src/routes/dashboard.projects.tsx`
  - `GET /projects`
  - `GET /projects/:id`
  - `POST /projects`
  - `PATCH /projects/:id`
  - `PATCH /projects/:id/workflow`

- `src/routes/dashboard.customers.tsx`
  - `GET /customers`
  - `POST /customers`
  - `PATCH /customers/:id`
  - `DELETE /customers/:id`

- `src/routes/dashboard.vendors.tsx`
  - `GET /vendors`
  - `POST /vendors`
  - `PATCH /vendors/:id`
  - `DELETE /vendors/:id`

- `src/routes/dashboard.stock.tsx`
  - `GET /stock-items`
  - `POST /stock-items`
  - `PATCH /stock-items/:id`
  - `DELETE /stock-items/:id`

- `src/routes/dashboard.finance.tsx`
  - `GET /transactions`
  - `POST /transactions`
  - `PATCH /transactions/:id`
  - `DELETE /transactions/:id`
  - `GET /invoices`
  - `POST /invoices`
  - `PATCH /invoices/:id`
  - `DELETE /invoices/:id`

- `src/routes/dashboard.services.tsx`
  - `GET /services`
  - `POST /services`
  - `PATCH /services/:id`
  - `DELETE /services/:id`

- `src/routes/dashboard.notifications.tsx`
  - `GET /notifications`
  - `PATCH /notifications/:id`

## Employee

- `src/routes/employee.dashboard.tsx`
  - `GET /projects`
  - `PATCH /projects/:id/workflow`
  - `POST /projects/:id/materials`

## Cleanup rules

- Keep all request code in `src/lib/api.ts`
- Keep route names in the UI consistent even if the generated router path is not yet renamed
- Keep backend endpoints in `src/lib/api-paths.ts` or a similar constants file
- Add new endpoints here before wiring them into the UI
