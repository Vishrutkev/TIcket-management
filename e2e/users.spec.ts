import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123'

/** Log in as admin and wait for the dashboard redirect. */
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}

/** Navigate to /users and wait for the heading to confirm the page loaded. */
async function goToUsersPage(page: Page) {
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible()
}

/** Generate a unique email suffix to avoid conflicts across test runs. */
function uniqueSuffix() {
  return Date.now()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('User Management — happy paths', () => {
  test.beforeEach(async ({ page }) => {
    // Sign out any existing session so each test starts fresh
    await page.request.post('/api/auth/sign-out')
    await loginAsAdmin(page)
    await goToUsersPage(page)
  })

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  test('users table displays seeded admin and agent rows', async ({ page }) => {
    // Both seeded users should be visible after login
    await expect(page.getByRole('cell', { name: /admin@example\.com/i })).toBeVisible()
    await expect(page.getByRole('cell', { name: /agent@example\.com/i })).toBeVisible()
  })

  test('table has Name, Email, Role and Status columns', async ({ page }) => {
    const thead = page.locator('thead')
    await expect(thead.getByText('Name')).toBeVisible()
    await expect(thead.getByText('Email')).toBeVisible()
    await expect(thead.getByText('Role')).toBeVisible()
    await expect(thead.getByText('Status')).toBeVisible()
  })

  test('seeded agent row shows role badge "agent" and status badge "Active"', async ({ page }) => {
    const agentRow = page.getByRole('row').filter({ hasText: 'agent@example.com' })
    await expect(agentRow.getByText('agent', { exact: true })).toBeVisible()
    await expect(agentRow.getByText('Active', { exact: true })).toBeVisible()
  })

  test('seeded admin row shows role badge "admin"', async ({ page }) => {
    const adminRow = page.getByRole('row').filter({ hasText: 'admin@example.com' })
    await expect(adminRow.getByText('admin', { exact: true })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  test('clicking "Add User" opens the New User dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New User' })).toBeVisible()
  })

  test('creating a new agent appears in the table', async ({ page }) => {
    const suffix = uniqueSuffix()
    const name = `Test Agent ${suffix}`
    const email = `testagent${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await expect(page.getByRole('heading', { name: 'New User' })).toBeVisible()

    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')

    await page.getByRole('button', { name: 'Create User' }).click()

    // Dialog should close after a successful create
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // New row should appear in the table
    await expect(page.getByRole('cell', { name: email })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: email }).getByText(name)).toBeVisible()
  })

  test('new user row shows "agent" role badge and "Active" status badge', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `rolecheck${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Role Check ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()

    const newRow = page.getByRole('row').filter({ hasText: email })
    await expect(newRow.getByText('agent', { exact: true })).toBeVisible()
    await expect(newRow.getByText('Active', { exact: true })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Update (Edit)
  // -------------------------------------------------------------------------

  test('clicking the edit icon opens the Edit User dialog pre-populated', async ({ page }) => {
    // Use the seeded agent row which is reliably present
    const agentRow = page.getByRole('row').filter({ hasText: 'agent@example.com' })
    await agentRow.getByRole('button', { name: 'Edit user' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible()

    // Name and email inputs should be pre-populated; password should be blank
    await expect(page.getByLabel('Name')).not.toHaveValue('')
    await expect(page.getByLabel('Email')).toHaveValue('agent@example.com')
    await expect(page.getByLabel('Password')).toHaveValue('')
  })

  test('editing a user name updates the row in the table', async ({ page }) => {
    const suffix = uniqueSuffix()
    const originalName = `Edit Me ${suffix}`
    const originalEmail = `editme${suffix}@example.com`
    const updatedName = `Edited Name ${suffix}`

    // First create a fresh user to edit so the test is self-contained
    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(originalName)
    await page.getByLabel('Email').fill(originalEmail)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Open the edit dialog for the newly created user
    const userRow = page.getByRole('row').filter({ hasText: originalEmail })
    await userRow.getByRole('button', { name: 'Edit user' }).click()
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible()

    // Clear name and type updated value
    await page.getByLabel('Name').clear()
    await page.getByLabel('Name').fill(updatedName)

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // The row should now show the updated name
    const updatedRow = page.getByRole('row').filter({ hasText: originalEmail })
    await expect(updatedRow.getByText(updatedName)).toBeVisible()
  })

  test('editing a user email updates the row in the table', async ({ page }) => {
    const suffix = uniqueSuffix()
    const name = `Email Edit ${suffix}`
    const originalEmail = `emailedit${suffix}@example.com`
    const updatedEmail = `emailedited${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(originalEmail)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: originalEmail })
    await userRow.getByRole('button', { name: 'Edit user' }).click()
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible()

    await page.getByLabel('Email').clear()
    await page.getByLabel('Email').fill(updatedEmail)

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByRole('cell', { name: updatedEmail })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Activate / Deactivate
  // -------------------------------------------------------------------------

  test('deactivating an active user changes status badge to "Inactive"', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `deactivate${suffix}@example.com`

    // Create a fresh active user
    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Deactivate ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await expect(userRow.getByText('Active', { exact: true })).toBeVisible()

    // Click Deactivate
    await userRow.getByRole('button', { name: 'Deactivate' }).click()

    // Status badge should now read "Inactive"
    await expect(userRow.getByText('Inactive', { exact: true })).toBeVisible()
    await expect(userRow.getByText('Active', { exact: true })).not.toBeVisible()
  })

  test('activating an inactive user changes status badge to "Active"', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `reactivate${suffix}@example.com`

    // Create and then deactivate a user
    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Reactivate ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await userRow.getByRole('button', { name: 'Deactivate' }).click()
    await expect(userRow.getByText('Inactive', { exact: true })).toBeVisible()

    // Now reactivate
    await userRow.getByRole('button', { name: 'Activate' }).click()

    await expect(userRow.getByText('Active', { exact: true })).toBeVisible()
    await expect(userRow.getByText('Inactive', { exact: true })).not.toBeVisible()
  })

  test('Deactivate button becomes Activate after deactivation', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `togglebutton${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Toggle ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await userRow.getByRole('button', { name: 'Deactivate' }).click()

    // Button label should have flipped to "Activate"
    await expect(userRow.getByRole('button', { name: 'Activate' })).toBeVisible()
    await expect(userRow.getByRole('button', { name: 'Deactivate' })).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  test('clicking Delete opens the confirmation dialog with user name', async ({ page }) => {
    const suffix = uniqueSuffix()
    const name = `Delete Me ${suffix}`
    const email = `deleteme${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await userRow.getByRole('button', { name: 'Delete' }).click()

    // Confirmation dialog should appear with the correct title and user name
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible()
    await expect(page.getByRole('dialog').getByText(name)).toBeVisible()
  })

  test('confirming deletion removes the user from the table', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `confirmdelete${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Confirm Delete ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await userRow.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible()

    // Confirm deletion — there are two "Delete" buttons on the page (row + dialog);
    // scope to the dialog to click the confirm button
    const confirmDialog = page.getByRole('dialog')
    await confirmDialog.getByRole('button', { name: 'Delete' }).click()

    // Dialog closes and the row is gone
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('cell', { name: email })).not.toBeVisible()
  })

  test('admin row has no Delete button', async ({ page }) => {
    const adminRow = page.getByRole('row').filter({ hasText: 'admin@example.com' })
    await expect(adminRow.getByRole('button', { name: 'Delete' })).not.toBeVisible()
  })

  test('cancelling the delete dialog leaves the user in the table', async ({ page }) => {
    const suffix = uniqueSuffix()
    const email = `canceldelete${suffix}@example.com`

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(`Cancel Delete ${suffix}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('securepass1')
    await page.getByRole('button', { name: 'Create User' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const userRow = page.getByRole('row').filter({ hasText: email })
    await userRow.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible()

    // Cancel instead of confirming
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    // User should still be in the table
    await expect(page.getByRole('cell', { name: email })).toBeVisible()
  })
})
