import { Role } from '@prisma/client'
import prisma from '../src/lib/prisma'
import { auth } from '../src/lib/auth'

async function createUser(name: string, email: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists, skipping`)
    return existing
  }
  const result = await auth.api.signUpEmail({ body: { name, email, password } })
  await prisma.user.update({
    where: { id: result.user.id },
    data: { role, emailVerified: true },
  })
  console.log(`Seeded ${role}: ${email}`)
  return result.user
}

const TICKETS: Array<{
  subject: string
  customerEmail: string
  category: 'general_question' | 'technical_question' | 'refund_request'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: 'open' | 'resolved' | 'closed'
  aiSummary: string
  assign: boolean
}> = [
  // Refund requests
  { subject: 'Refund for order #8821 — item never arrived', customerEmail: 'james.miller@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Customer placed order #8821 two weeks ago and has not received the item. Requesting a full refund.', assign: true },
  { subject: 'Double charged on my credit card', customerEmail: 'sarah.johnson@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Customer was billed twice for the same order. Wants duplicate charge reversed immediately.', assign: false },
  { subject: 'Return request for damaged laptop', customerEmail: 'david.chen@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'Laptop arrived with cracked screen. Customer wants return label and full refund.', assign: true },
  { subject: 'Refund for cancelled subscription', customerEmail: 'emily.watson@example.com', category: 'refund_request', priority: 'normal', status: 'resolved', aiSummary: 'Customer cancelled annual subscription and requests pro-rata refund for unused months.', assign: false },
  { subject: 'Wrong item sent — need refund or replacement', customerEmail: 'michael.brown@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'Customer ordered a blue jacket but received a red one. Wants correct item or full refund.', assign: true },
  { subject: 'Partial refund for missing items in bundle', customerEmail: 'lisa.taylor@example.com', category: 'refund_request', priority: 'normal', status: 'resolved', aiSummary: 'Bundle order arrived missing two accessories. Customer requesting partial refund for missing items.', assign: false },
  { subject: 'Refund not received after 14 days', customerEmail: 'robert.anderson@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'Refund was approved 14 days ago but amount has not appeared in customer\'s bank account.', assign: true },
  { subject: 'Accidental purchase — requesting refund', customerEmail: 'jennifer.white@example.com', category: 'refund_request', priority: 'low', status: 'closed', aiSummary: 'Customer accidentally purchased the wrong product and wants a refund within the 30-day window.', assign: false },
  { subject: 'Item arrived broken — want money back', customerEmail: 'william.harris@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Coffee maker arrived with broken heating element. Customer wants immediate refund and return label.', assign: true },
  { subject: 'Subscription renewal charged without consent', customerEmail: 'patricia.martin@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'Customer claims auto-renewal was charged without prior notification. Requesting refund.', assign: false },
  { subject: 'Return approved but label not received', customerEmail: 'charles.thompson@example.com', category: 'refund_request', priority: 'normal', status: 'open', aiSummary: 'Return was approved last week but customer never received the prepaid shipping label.', assign: true },
  { subject: 'Refund for duplicate order', customerEmail: 'barbara.garcia@example.com', category: 'refund_request', priority: 'normal', status: 'resolved', aiSummary: 'System error caused customer to place the same order twice. Requesting refund on duplicate.', assign: false },
  { subject: 'Product not as described — refund needed', customerEmail: 'joseph.martinez@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'Product dimensions in listing were incorrect. Item does not fit intended space. Wants refund.', assign: true },
  { subject: 'Refund for out-of-stock item', customerEmail: 'susan.robinson@example.com', category: 'refund_request', priority: 'normal', status: 'closed', aiSummary: 'Customer pre-ordered item that is now permanently out of stock. Wants automatic refund processed.', assign: false },
  { subject: 'Charged for free trial', customerEmail: 'thomas.clark@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Customer signed up for free trial but was charged immediately. Claims no credit card was required at signup.', assign: true },

  // Technical questions
  { subject: 'Cannot log in — password reset not working', customerEmail: 'jessica.lewis@example.com', category: 'technical_question', priority: 'urgent', status: 'open', aiSummary: 'Customer is locked out of their account. Password reset emails are not arriving despite multiple attempts.', assign: true },
  { subject: 'App crashes on iOS 17 immediately on launch', customerEmail: 'christopher.lee@example.com', category: 'technical_question', priority: 'urgent', status: 'open', aiSummary: 'App crashes within 2 seconds of opening on iPhone 15 running iOS 17. Began after latest update.', assign: false },
  { subject: 'Payment page fails with error code 503', customerEmail: 'ashley.walker@example.com', category: 'technical_question', priority: 'urgent', status: 'resolved', aiSummary: 'Customer gets 503 error when attempting checkout. Has tried multiple browsers and payment methods.', assign: true },
  { subject: 'Two-factor authentication not sending SMS', customerEmail: 'matthew.hall@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: '2FA SMS codes not being received. Customer verified phone number is correct and phone can receive other SMS.', assign: false },
  { subject: 'Export to CSV producing empty file', customerEmail: 'amanda.allen@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'CSV export downloads an empty file despite data being visible in the dashboard. Issue affects all date ranges.', assign: true },
  { subject: 'API rate limit hit despite low usage', customerEmail: 'daniel.young@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Developer receiving 429 errors with only ~50 requests/hour, well below the stated 1000 req/hour limit.', assign: false },
  { subject: 'Webhook not firing for payment.completed event', customerEmail: 'melissa.hernandez@example.com', category: 'technical_question', priority: 'high', status: 'resolved', aiSummary: 'Webhook endpoint configured and verified, but payment.completed events are not being delivered.', assign: true },
  { subject: 'Search returning no results for existing items', customerEmail: 'ryan.king@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Full-text search returns empty results for items that are clearly visible when browsing categories.', assign: false },
  { subject: 'Email notifications going to spam', customerEmail: 'kimberly.wright@example.com', category: 'technical_question', priority: 'normal', status: 'resolved', aiSummary: 'All transactional emails including order confirmations are landing in spam folder across Gmail and Outlook.', assign: true },
  { subject: 'Dashboard loading very slowly', customerEmail: 'justin.scott@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Dashboard takes 30+ seconds to load. Customer reports other apps on same connection load normally.', assign: false },
  { subject: 'Image upload failing with large files', customerEmail: 'brittany.green@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Files over 5MB fail silently during upload. No error message shown. Smaller files work fine.', assign: true },
  { subject: 'OAuth integration with Google not working', customerEmail: 'aaron.adams@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Google OAuth redirects to blank page after consent. Error visible in browser console: invalid_redirect_uri.', assign: false },
  { subject: 'Mobile app not syncing offline changes', customerEmail: 'stephanie.baker@example.com', category: 'technical_question', priority: 'normal', status: 'closed', aiSummary: 'Edits made while offline are lost when connection is restored instead of being synced to the server.', assign: true },
  { subject: 'Date picker not working on Firefox', customerEmail: 'nicholas.gonzalez@example.com', category: 'technical_question', priority: 'low', status: 'resolved', aiSummary: 'Date picker component renders but clicking dates has no effect in Firefox 120. Works fine in Chrome.', assign: false },
  { subject: 'PDF invoice generation times out', customerEmail: 'samantha.nelson@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Generating PDF invoices fails with timeout error for invoices with more than 50 line items.', assign: true },
  { subject: 'Account merge losing order history', customerEmail: 'tyler.carter@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Merging two accounts deletes the older account\'s order history. Customer wants all records preserved.', assign: false },
  { subject: 'Notification preferences not saving', customerEmail: 'rachel.mitchell@example.com', category: 'technical_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer disables email notifications but setting reverts to enabled after each page reload.', assign: true },
  { subject: 'Browser extension conflicting with checkout', customerEmail: 'brandon.perez@example.com', category: 'technical_question', priority: 'normal', status: 'closed', aiSummary: 'Checkout fails when ad-blocker extension is active. Customer requests site-level fix so users aren\'t blocked.', assign: false },
  { subject: 'Bulk import CSV rejecting valid format', customerEmail: 'kayla.roberts@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'CSV file matches exact template provided but import wizard shows "invalid format" on every row.', assign: true },
  { subject: 'Discount code not applying at checkout', customerEmail: 'austin.turner@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Valid promotional code entered but cart shows no discount. Code is confirmed active in admin panel.', assign: false },
  { subject: 'Cannot delete account — button disabled', customerEmail: 'lauren.phillips@example.com', category: 'technical_question', priority: 'low', status: 'resolved', aiSummary: 'Customer wants to delete account but the delete button is permanently greyed out in settings.', assign: true },
  { subject: 'SSO SAML configuration failing validation', customerEmail: 'zachary.campbell@example.com', category: 'technical_question', priority: 'urgent', status: 'open', aiSummary: 'Enterprise SSO setup via SAML failing with "invalid metadata" error despite following documentation exactly.', assign: false },
  { subject: 'Chart data not updating in real-time', customerEmail: 'brittney.parker@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Live analytics charts stopped updating in real time. Data only refreshes on manual page reload.', assign: true },
  { subject: 'API key not working after rotation', customerEmail: 'derek.evans@example.com', category: 'technical_question', priority: 'high', status: 'resolved', aiSummary: 'After rotating API key, all requests return 401 Unauthorized despite using the newly generated key.', assign: false },
  { subject: 'Mobile push notifications not arriving', customerEmail: 'tiffany.edwards@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Push notifications enabled but not arriving on Android. iOS users on same account receive them fine.', assign: true },
  { subject: 'Print layout broken on all pages', customerEmail: 'cody.collins@example.com', category: 'technical_question', priority: 'low', status: 'closed', aiSummary: 'When printing any page, content overflows and columns collapse. Print CSS seems to have a regression.', assign: false },

  // General questions
  { subject: 'How do I upgrade my plan?', customerEmail: 'morgan.stewart@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Customer wants to upgrade from Starter to Professional plan and asks about the process and billing implications.', assign: false },
  { subject: 'Do you offer annual billing discounts?', customerEmail: 'hayley.sanchez@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Customer asking about discounts available for switching from monthly to annual billing.', assign: false },
  { subject: 'Where can I find my invoice history?', customerEmail: 'blake.morris@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Customer cannot find where to download past invoices. Asking for navigation instructions.', assign: true },
  { subject: 'Can I have multiple users on one account?', customerEmail: 'alexis.rogers@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer asking whether their plan supports multiple team members and how to add them.', assign: false },
  { subject: 'What are the data retention policies?', customerEmail: 'hunter.reed@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Enterprise customer asking about how long data is retained after account cancellation for compliance purposes.', assign: true },
  { subject: 'Does the platform support GDPR compliance?', customerEmail: 'skylar.cook@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Legal team asking for documentation on GDPR compliance features including data portability and erasure.', assign: false },
  { subject: 'Is there a mobile app available?', customerEmail: 'peyton.morgan@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Customer asking whether there is a native iOS and Android app or only web access.', assign: false },
  { subject: 'How do I export all my data?', customerEmail: 'riley.bell@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer wants to export all account data before cancellation. Asking for the export process.', assign: true },
  { subject: 'What payment methods are accepted?', customerEmail: 'taylor.murphy@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Customer asking whether PayPal, bank transfer, and crypto are accepted in addition to credit cards.', assign: false },
  { subject: 'Can I pause my subscription?', customerEmail: 'jordan.bailey@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer going on leave and wants to pause subscription for 2 months without cancelling.', assign: false },
  { subject: 'How is pricing calculated for API usage?', customerEmail: 'cameron.rivera@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Developer asking for clarification on how API call costs are calculated and billed at end of month.', assign: true },
  { subject: 'Is there an SLA for uptime?', customerEmail: 'dylan.cooper@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Enterprise customer asking about formal SLA, uptime guarantee percentage, and compensation for downtime.', assign: false },
  { subject: 'How do I transfer ownership of the account?', customerEmail: 'cassidy.richardson@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Company ownership changing and customer needs to transfer primary account holder to a new email address.', assign: true },
  { subject: 'What integrations are available?', customerEmail: 'sage.cox@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Potential customer asking for a complete list of third-party integrations before signing up.', assign: false },
  { subject: 'Are there any student or nonprofit discounts?', customerEmail: 'finley.howard@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Customer from a registered nonprofit asking about any available discounts or charitable pricing.', assign: false },
  { subject: 'How long does onboarding take?', customerEmail: 'lennon.ward@example.com', category: 'general_question', priority: 'low', status: 'open', aiSummary: 'New enterprise customer asking about typical onboarding timeline and what resources are provided.', assign: true },
  { subject: 'Can I use the service in multiple countries?', customerEmail: 'emery.torres@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer operating in 5 countries asking about multi-currency, multi-language, and regional data storage.', assign: false },
  { subject: 'Is there a free trial available?', customerEmail: 'oakley.long@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Prospect asking about free trial options, duration, and whether credit card is required.', assign: false },
  { subject: 'How do I submit a feature request?', customerEmail: 'harlow.hill@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Customer wants to formally request a feature and asks for the proper channel to submit it.', assign: true },
  { subject: 'What happens to my data if I cancel?', customerEmail: 'brixton.flores@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Customer considering cancellation and wants to know data retention period and export options.', assign: false },
  { subject: 'How do I add a custom domain?', customerEmail: 'rain.green@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer wants to configure a custom subdomain for their account portal. Asking for DNS setup steps.', assign: true },
  { subject: 'Can I get a W-9 for tax purposes?', customerEmail: 'sterling.adams@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Accounting team asking for a W-9 form from the company to process their vendor payments correctly.', assign: false },
  { subject: 'Do you offer white-labelling?', customerEmail: 'river.nelson@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Agency asking whether the platform can be white-labelled for reselling to their own clients.', assign: true },
  { subject: 'Where is my data stored geographically?', customerEmail: 'ember.carter@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Compliance officer asking about data residency — specifically whether EU customer data stays within the EU.', assign: false },
  { subject: 'How do I set up team permissions?', customerEmail: 'indigo.mitchell@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Team admin asking about setting read-only vs edit permissions for different team members.', assign: true },
  { subject: 'What is the cancellation policy?', customerEmail: 'cove.perez@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Customer asking whether there are any early termination fees for cancelling an annual plan mid-year.', assign: false },
  { subject: 'How do I get a receipt for my purchase?', customerEmail: 'grove.roberts@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Customer needs a detailed receipt with VAT breakdown for their company expense report.', assign: false },
  { subject: 'Is there an audit log feature?', customerEmail: 'coast.turner@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Security team asking whether there is an audit log of all user actions and data access events.', assign: true },
  { subject: 'Can the API be used for bulk operations?', customerEmail: 'vale.phillips@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Developer asking about batch API endpoints for importing/updating thousands of records efficiently.', assign: false },
  { subject: 'Do you have a referral program?', customerEmail: 'drift.campbell@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Customer asking about referral or affiliate program and whether they can earn credit for referrals.', assign: false },
  { subject: 'How do I change my billing currency?', customerEmail: 'pine.parker@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Customer currently billed in USD and wants to switch to EUR billing due to exchange rate costs.', assign: true },
  { subject: 'What accessibility features are supported?', customerEmail: 'reef.evans@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'HR team asking about WCAG 2.1 AA compliance and screen reader support for visually impaired employees.', assign: false },
  { subject: 'How do I contact my account manager?', customerEmail: 'crest.edwards@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Enterprise customer cannot find contact details for their assigned account manager after team changes.', assign: true },
  { subject: 'Can I get a custom contract?', customerEmail: 'bloom.collins@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Legal team asking whether the standard terms can be modified and if a custom MSA can be negotiated.', assign: false },
  { subject: 'How do I enable SSO for my organisation?', customerEmail: 'frost.stewart@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'IT admin asking about prerequisites and steps to enable SSO via SAML or OIDC for their organisation.', assign: true },
  { subject: 'Confused about pricing tiers', customerEmail: 'gale.sanchez@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'Prospect asking for a clear comparison of Starter, Pro, and Enterprise tiers including feature differences.', assign: false },

  // Additional tickets to reach 100
  { subject: 'Refund for event ticket — event cancelled', customerEmail: 'nova.james@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Event was cancelled by the organiser. Customer wants full refund for two tickets purchased last month.', assign: true },
  { subject: 'Charged after account deletion', customerEmail: 'orion.brooks@example.com', category: 'refund_request', priority: 'urgent', status: 'open', aiSummary: 'Account was deleted 3 days ago but a charge still appeared on card the following month. Wants refund.', assign: false },
  { subject: 'Partial shipment — refund for missing half', customerEmail: 'echo.price@example.com', category: 'refund_request', priority: 'high', status: 'resolved', aiSummary: 'Order of 4 items only contained 2 on delivery. Customer wants refund for the two missing items.', assign: true },
  { subject: 'Database connection dropping intermittently', customerEmail: 'zion.butler@example.com', category: 'technical_question', priority: 'urgent', status: 'open', aiSummary: 'Production database connections drop every few hours, causing 502 errors for end users. Needs urgent fix.', assign: false },
  { subject: 'File download returns 404 after upload', customerEmail: 'lyric.simmons@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Files upload successfully but the generated download URL returns 404 immediately after upload completes.', assign: true },
  { subject: 'Scheduled report not running at set time', customerEmail: 'crew.foster@example.com', category: 'technical_question', priority: 'normal', status: 'resolved', aiSummary: 'Weekly report scheduled for Monday 9am has not run for the last 3 weeks. No error shown in logs.', assign: false },
  { subject: 'How do I set up automated backups?', customerEmail: 'lumen.gonzalez@example.com', category: 'general_question', priority: 'normal', status: 'open', aiSummary: 'Customer asking about configuring automatic daily backups and how long backup files are retained.', assign: true },
  { subject: 'Can I embed the widget on a third-party site?', customerEmail: 'pixel.diaz@example.com', category: 'general_question', priority: 'normal', status: 'resolved', aiSummary: 'Customer wants to embed a chat or form widget on their Squarespace and WordPress sites.', assign: false },
  { subject: 'Incorrect tax rate applied to invoice', customerEmail: 'tide.mendez@example.com', category: 'refund_request', priority: 'high', status: 'open', aiSummary: 'VAT applied at 20% but customer is exempt. Requesting corrected invoice and refund of the tax charged.', assign: true },
  { subject: 'App not available in my country App Store', customerEmail: 'wren.cole@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Customer in Brazil cannot find the app in the App Store. Asking whether regional availability is planned.', assign: false },
  { subject: 'Multi-factor auth locked me out of account', customerEmail: 'sage.hunt@example.com', category: 'technical_question', priority: 'urgent', status: 'resolved', aiSummary: 'Customer lost access to authenticator app and backup codes. Locked out and needs account recovery.', assign: true },
  { subject: 'Do you support IPv6?', customerEmail: 'dune.shaw@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Network engineer asking whether the infrastructure supports IPv6 for their enterprise network policy.', assign: false },
  { subject: 'Webhook events arriving out of order', customerEmail: 'flint.porter@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Webhook events for the same order arriving in wrong sequence. Processing logic depends on correct order.', assign: true },
  { subject: 'Trial ended but features still showing', customerEmail: 'bay.jenkins@example.com', category: 'general_question', priority: 'low', status: 'closed', aiSummary: 'Free trial ended 2 days ago but paid features are still accessible. Customer unsure whether they were charged.', assign: false },
  { subject: 'Dark mode causing text to be unreadable', customerEmail: 'crest.perry@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'In dark mode, several input labels and table headers render with white text on white background.', assign: true },
  { subject: 'Promotional email after unsubscribing', customerEmail: 'vale.wood@example.com', category: 'general_question', priority: 'high', status: 'open', aiSummary: 'Customer unsubscribed from marketing 2 months ago but is still receiving promotional emails. Wants escalation.', assign: false },
  { subject: 'CSV export includes deleted records', customerEmail: 'reef.long@example.com', category: 'technical_question', priority: 'normal', status: 'resolved', aiSummary: 'Exported CSV includes records that were deleted months ago. Soft-delete logic not being applied to export.', assign: true },
  { subject: 'Billing address not saving correctly', customerEmail: 'grove.hayes@example.com', category: 'technical_question', priority: 'normal', status: 'open', aiSummary: 'Customer updates billing address but the previous address reappears on the next invoice generated.', assign: false },
  { subject: 'Refund for subscription I never used', customerEmail: 'drift.price@example.com', category: 'refund_request', priority: 'normal', status: 'closed', aiSummary: 'Customer subscribed but never logged in after sign-up. Requesting refund for all charges over 3 months.', assign: true },
  { subject: 'How do I generate an API key?', customerEmail: 'north.cole@example.com', category: 'general_question', priority: 'low', status: 'resolved', aiSummary: 'New developer asking where to find or generate an API key for integration with their application.', assign: false },
  { subject: 'SSO users not inheriting correct roles', customerEmail: 'canyon.reed@example.com', category: 'technical_question', priority: 'high', status: 'open', aiSummary: 'Users provisioned via SSO are assigned default role instead of the role specified in SAML attributes.', assign: true },
  { subject: 'Overpayment on last invoice', customerEmail: 'moss.james@example.com', category: 'refund_request', priority: 'normal', status: 'resolved', aiSummary: 'Customer was billed for 15 seats but only has 10. Requesting credit for 5 seat overage last billing cycle.', assign: false },
  { subject: 'Cannot download invoice as PDF', customerEmail: 'frost.cox@example.com', category: 'technical_question', priority: 'low', status: 'resolved', aiSummary: 'PDF download button on invoice page produces an empty download with 0 bytes. Browser console shows no error.', assign: true },
]

function deriveCustomerName(email: string): string {
  return email
    .split('@')[0]
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function seedTickets(agentId: string | null) {
  // Always wipe and re-seed so customerName is backfilled
  await prisma.message.deleteMany()
  await prisma.ticket.deleteMany()
  console.log('Cleared existing tickets and messages')

  // Spread creation dates over the past 90 days so sorting is meaningful
  const now = Date.now()
  const ninetyDays = 90 * 24 * 60 * 60 * 1000

  for (let i = 0; i < TICKETS.length; i++) {
    const t = TICKETS[i]
    const createdAt = new Date(now - (ninetyDays * (TICKETS.length - i)) / TICKETS.length)

    await prisma.ticket.create({
      data: {
        subject: t.subject,
        customerEmail: t.customerEmail,
        customerName: deriveCustomerName(t.customerEmail),
        status: t.status,
        category: t.category,
        priority: t.priority,
        aiSummary: t.aiSummary,
        assignedAgentId: t.assign && agentId ? agentId : null,
        createdAt,
        updatedAt: createdAt,
      },
    })
  }

  console.log(`Seeded ${TICKETS.length} tickets`)
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const agentEmail = process.env.SEED_AGENT_EMAIL ?? 'agent@example.com'
  const agentPassword = process.env.SEED_AGENT_PASSWORD

  if (!adminEmail || !adminPassword) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  if (!agentPassword) throw new Error('SEED_AGENT_PASSWORD must be set')

  await createUser('Admin', adminEmail, adminPassword, Role.admin)
  const agent = await createUser('Agent', agentEmail, agentPassword, Role.agent)
  await seedTickets(agent?.id ?? null)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
