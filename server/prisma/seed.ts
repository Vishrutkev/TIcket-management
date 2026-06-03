import prisma from '../src/lib/prisma'
import { auth } from '../src/lib/auth'

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })

  if (existing) {
    console.log('Admin user already exists, skipping seed')
    return
  }

  const result = await auth.api.signUpEmail({
    body: { name: 'Admin', email: 'admin@example.com', password: 'admin123' },
  })

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: 'admin', emailVerified: true },
  })

  console.log('Seeded admin user: admin@example.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
