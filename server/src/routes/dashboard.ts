import { Router } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/', async (_req, res) => {
  const rows = await prisma.$queryRaw<[{ get_dashboard_stats: unknown }]>`
    SELECT get_dashboard_stats()
  `
  res.json(rows[0].get_dashboard_stats)
})

export default router
