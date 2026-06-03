import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })

  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@example.com',
        passwordHash,
        role: 'admin',
      },
    })
    console.log('Seeded admin user: admin@example.com / admin123')
  } else {
    console.log('Admin user already exists, skipping seed')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
