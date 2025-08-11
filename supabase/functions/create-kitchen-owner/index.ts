import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateKitchenOwnerRequest {
  email: string
  full_name: string
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  payment_id: string
  subscription_amount: number
  subscription_expires_at: string
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const requestData: CreateKitchenOwnerRequest = await req.json()

    // Validate required fields
    const requiredFields = ['email', 'full_name', 'subscription_plan', 'payment_id', 'subscription_amount', 'subscription_expires_at']
    for (const field of requiredFields) {
      if (!requestData[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Check if email already exists
    const { data: existingOwner } = await supabase
      .from('kitchen_owners')
      .select('id')
      .eq('email', requestData.email)
      .single()

    if (existingOwner) {
      return new Response(
        JSON.stringify({ error: 'Kitchen owner with this email already exists' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate random password
    const randomPassword = generateRandomPassword()
    const hashedPassword = await hashPassword(randomPassword)

    // Create kitchen owner record
    const { data: kitchenOwner, error: createError } = await supabase
      .from('kitchen_owners')
      .insert({
        email: requestData.email,
        full_name: requestData.full_name,
        subscription_plan: requestData.subscription_plan,
        payment_id: requestData.payment_id,
        subscription_amount: requestData.subscription_amount,
        subscription_expires_at: requestData.subscription_expires_at,
        password_hash: hashedPassword,
        is_setup_completed: false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating kitchen owner:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create kitchen owner' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: requestData.email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.full_name,
        role: 'kitchen_owner'
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      // Clean up kitchen owner record if auth creation fails
      await supabase
        .from('kitchen_owners')
        .delete()
        .eq('id', kitchenOwner.id)

      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email: requestData.email,
        full_name: requestData.full_name,
        role: 'kitchen_owner'
      })

    if (userError) {
      console.error('Error creating user record:', userError)
    }

    // Update kitchen owner with user_id
    await supabase
      .from('kitchen_owners')
      .update({ user_id: authUser.user.id })
      .eq('id', kitchenOwner.id)

    // Send welcome email with credentials
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Kitchen POS!</h2>
        <p>Hello ${requestData.full_name},</p>
        <p>Your Kitchen POS subscription has been activated successfully. Here are your login credentials:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${requestData.email}</p>
          <p><strong>Password:</strong> ${randomPassword}</p>
        </div>
        
        <p>Please log in to your admin panel to complete your restaurant setup.</p>
        <p>For security reasons, we recommend changing your password after your first login.</p>
        
        <p>Best regards,<br>Kitchen POS Team</p>
      </div>
    `

    // Note: In a real implementation, you would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, we'll just log the email content
    console.log('Welcome email would be sent:', emailHtml)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Kitchen owner created successfully',
        data: {
          id: kitchenOwner.id,
          email: requestData.email,
          full_name: requestData.full_name,
          subscription_plan: requestData.subscription_plan,
          credentials: {
            email: requestData.email,
            password: randomPassword // In production, don't return password in response
          }
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})