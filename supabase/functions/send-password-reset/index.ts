import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_PASSWORD_RESET_HOOK_SECRET') as string
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const senderEmail = Deno.env.get('SENDER_EMAIL') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)

    console.log('Received password reset webhook request')

    let webhookData
    try {
      webhookData = wh.verify(payload, headers) as {
        user: {
          email: string
        }
        email_data: {
          token: string
          token_hash: string
          redirect_to: string
          email_action_type: string
        }
      }
    } catch (error) {
      console.error('Webhook verification failed:', error)
      return new Response(
        JSON.stringify({ error: 'Webhook verification failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = webhookData

    console.log(`Processing password reset for user: ${user.email}`)

    // Construct the reset URL
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`

    console.log('Rendering email template...')
    
    // Render the React Email template
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        resetUrl,
        token,
        userEmail: user.email,
      })
    )

    console.log('Sending email via Resend...')

    // Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: senderEmail || 'Wine Note <onboarding@resend.dev>',
      to: [user.email],
      subject: '🔐 Réinitialisation de votre mot de passe - Wine Note',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Password reset email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-password-reset function:', error)
    
    // Return 200 to avoid blocking Supabase auth flow
    return new Response(
      JSON.stringify({
        error: error.message,
        note: 'Error logged but returning 200 to not block auth flow',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
