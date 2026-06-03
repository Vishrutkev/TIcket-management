import { z } from 'zod'
import type { Role as PrismaRole } from '@prisma/client'

// Values are derived from Prisma's Role enum.
// The `satisfies` constraint makes TypeScript error here if the Prisma enum changes.
export const Role = {
  admin: 'admin',
  agent: 'agent',
} as const satisfies Record<string, PrismaRole>

export type Role = (typeof Role)[keyof typeof Role]

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type CreateUserFields = z.infer<typeof createUserSchema>

export type User = {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt?: string
}

export const editUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().refine(
    val => val === '' || val.length >= 8,
    { message: 'Password must be at least 8 characters' }
  ),
})

export type EditUserFields = z.infer<typeof editUserSchema>
