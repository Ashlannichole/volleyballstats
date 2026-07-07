import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import nodemailer from 'nodemailer'

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })

// Email provider: swap these two blocks to switch between Gmail (beta) and Resend (production)
// ---- Gmail (beta, no domain needed) ----
function makeTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  })
}
async function sendOtpEmail(to: string, otp: string) {
  const from = `Volleyball Stats <${process.env.GMAIL_USER}>`
  await makeTransport().sendMail({
    from,
    to,
    subject: `Your sign-in code: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="color:#4a1d8a;margin-bottom:8px">Volleyball Stats</h2>
        <p style="color:#444;margin-bottom:24px">Use this code to sign in. It expires in 10 minutes.</p>
        <div style="background:#f3f0ff;border-radius:12px;padding:24px;text-align:center">
          <span style="font-size:40px;font-weight:900;letter-spacing:8px;color:#4a1d8a">${otp}</span>
        </div>
        <p style="color:#888;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore it.</p>
      </div>
    `,
  })
}
// ---- End Gmail block ----

// ---- Resend (production, swap in when you have a domain) ----
// import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY!)
// async function sendOtpEmail(to: string, otp: string) {
//   await resend.emails.send({
//     from: process.env.EMAIL_FROM ?? 'Volleyball Stats <noreply@yourdomain.com>',
//     to,
//     subject: `Your sign-in code: ${otp}`,
//     html: `...same html...`,
//   })
// }
// ---- End Resend block ----

const OTP_TTL     = 600               // 10 minutes
const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days

function makeOtp()   { return Math.floor(100000 + Math.random() * 900000).toString() }
function makeToken() { return [...Array(40)].map(() => Math.random().toString(36)[2]).join('') }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const action = req.query.action as string

  // POST /api/auth?action=send  { email }
  if (action === 'send') {
    const { email } = req.body as { email?: string }
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }
    const key = email.trim().toLowerCase()
    const otp = makeOtp()
    await redis.set(`otp:${key}`, otp, { ex: OTP_TTL })

    try {
      await sendOtpEmail(key, otp)
    } catch (e) {
      console.error('Email send error', e)
      return res.status(500).json({ error: 'Failed to send email. Check GMAIL_USER and GMAIL_APP_PASSWORD in Vercel env vars.' })
    }
    return res.status(200).json({ ok: true })
  }

  // POST /api/auth?action=verify  { email, otp }
  if (action === 'verify') {
    const { email, otp } = req.body as { email?: string; otp?: string }
    if (!email || !otp) return res.status(400).json({ error: 'Email and code are required.' })

    const key    = email.trim().toLowerCase()
    const stored = await redis.get(`otp:${key}`)
    if (!stored || String(stored) !== otp.trim()) {
      return res.status(401).json({ error: 'Incorrect or expired code. Try again.' })
    }

    await redis.del(`otp:${key}`)
    const token = makeToken()
    await redis.set(`session:${token}`, key, { ex: SESSION_TTL })
    return res.status(200).json({ token, email: key })
  }

  // POST /api/auth?action=signout  { token }
  if (action === 'signout') {
    const { token } = req.body as { token?: string }
    if (token) await redis.del(`session:${token}`)
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
