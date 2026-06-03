---
name: users-page-selectors
description: Exact locators and text for every interactive element on the /users page (UsersPage + UsersTable + UserDialog)
metadata:
  type: reference
---

## Page heading

```typescript
page.getByRole('heading', { name: /user management/i })
```

## Add User button (always visible)

```typescript
page.getByRole('button', { name: 'Add User' })
```

## Table structure

- Columns: Name | Email | Role | Status | Actions
- Each data row: `page.getByRole('row').filter({ hasText: '<email>' })`
- Email cell: `page.getByRole('cell', { name: '<email>' })`

## Role badges

- admin: text "admin" (purple bg)
- agent: text "agent" (blue bg)

## Status badges

- Active: text "Active" (green bg)
- Inactive: text "Inactive" (muted bg)

## Row action buttons

```typescript
// Edit (pencil icon)
row.getByRole('button', { name: 'Edit user' })   // aria-label="Edit user"

// Toggle activation
row.getByRole('button', { name: 'Deactivate' })  // when isActive=true
row.getByRole('button', { name: 'Activate' })    // when isActive=false

// Delete (agents only, no Delete button for admin role)
row.getByRole('button', { name: 'Delete' })
```

## Create dialog (UserDialog, isEdit=false)

- Opened by: `Add User` button
- Dialog title: "New User"
- Name input: `page.getByLabel('Name')`  (id="ud-name")
- Email input: `page.getByLabel('Email')` (id="ud-email")
- Password input: `page.getByLabel('Password')` (id="ud-password")
- Submit: `page.getByRole('button', { name: 'Create User' })`
- Cancel: `page.getByRole('button', { name: 'Cancel' })`

## Edit dialog (UserDialog, isEdit=true)

- Opened by: edit icon button in row
- Dialog title: "Edit User"
- Same label/input selectors as create dialog
- Name and email pre-populated; password blank
- Submit: `page.getByRole('button', { name: 'Save changes' })`
- Cancel: `page.getByRole('button', { name: 'Cancel' })`

## Delete confirmation dialog (UsersTable inline)

- Opened by: Delete button in row
- Dialog title: "Delete user"
- Shows user name in description text
- Confirm: `page.getByRole('dialog').getByRole('button', { name: 'Delete' })`
  NOTE: scope to dialog — the row Delete button is still in DOM when dialog is open
- Cancel: `page.getByRole('button', { name: 'Cancel' })`

## Gotcha: two Delete buttons when confirmation dialog is open

When the delete confirmation dialog is open, the row's Delete button is still in the DOM.
Always scope the confirm button to the dialog:

```typescript
const confirmDialog = page.getByRole('dialog')
await confirmDialog.getByRole('button', { name: 'Delete' }).click()
```
