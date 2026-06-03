import { z } from 'zod'

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
  role: 'admin' | 'agent'
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
