import { Role } from '@prisma/client'
import prisma from '../src/lib/prisma'
import { auth } from '../src/lib/auth'

async function createUser(name: string, email: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists, skipping`)
    return
  }

  const result = await auth.api.signUpEmail({ body: { name, email, password } })

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role, emailVerified: true },
  })

  console.log(`Seeded ${role}: ${email}`)
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env')
  }

  await createUser('Admin', adminEmail, adminPassword, Role.admin)
  await createUser('Agent', 'agent@example.com', adminPassword, Role.agent)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
