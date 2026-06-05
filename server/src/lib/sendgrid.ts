import sgMail from '@sendgrid/mail'

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
  ticketId?: string
}

/** Returns the Message-ID we embed so inbound replies can be threaded back. */
export function ticketMessageId(ticketId: string, fromEmail: string): string {
  const domain = fromEmail.split('@')[1] ?? 'mail.local'
  return `<ticket-${ticketId}@${domain}>`
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  const from = process.env.SENDGRID_FROM_EMAIL
  if (!apiKey || !from) {
    console.warn('[sendgrid] skipped — SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set')
    return
  }

  sgMail.setApiKey(apiKey)

  const customHeaders: Record<string, string> = {}
  if (opts.ticketId) {
    // Embed ticket ID in Message-ID so customer replies carry In-Reply-To with this value
    customHeaders['Message-ID'] = ticketMessageId(opts.ticketId, from)
  }

  try {
    await sgMail.send({
      to: opts.to,
      from,
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(Object.keys(customHeaders).length ? { headers: customHeaders } : {}),
    })
    console.log(`[sendgrid] sent "${opts.subject}" to ${opts.to}`)
  } catch (err: unknown) {
    const sgErr = err as { response?: { status?: number; body?: { errors?: unknown } } }
    if (sgErr?.response) {
      console.error('[sendgrid] API error', sgErr.response.status, JSON.stringify(sgErr.response.body?.errors))
    } else {
      console.error('[sendgrid] unexpected error', err)
    }
    throw err
  }
}
