import PgBoss from 'pg-boss'

const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! })

boss.on('error', (err) => console.error('[pg-boss]', err))

export default boss
