/**
 * Script to create missing auth user for existing super admin database record
 */

import { createClient } from '@supabase/supabase-js'

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMissingAuthUser() {
  const adminEmail = 'admin@kitchenpos.com'
  const adminPassword = 'SuperAdmin123!'

  try {
    console.log('🔍 Checking for existing super admin database record...')

    // First, check if we have a super admin record in the database
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .eq('role', 'super_admin')
      .single()

    if (fetchError) {
      console.error('❌ No super admin found in database:', fetchError.message)
      console.log('Please run the create-super-admin script first to create the database record.')
      return
    }

    console.log('✅ Found super admin database record:', {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
      auth_user_id: existingUser.auth_user_id
    })

    // Check if auth user already exists
    if (existingUser.auth_user_id) {
      console.log('🔍 Checking if auth user exists...')
      
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const authUser = authUsers.users.find(u => u.id === existingUser.auth_user_id)
      
      if (authUser) {
        console.log('✅ Auth user already exists. Testing login...')
        
        // Test login
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        })

        if (loginError) {
          console.log('❌ Login failed:', loginError.message)
          console.log('The auth user exists but login is failing. This might be a password issue.')
          console.log('Try resetting the password in Supabase Dashboard or delete and recreate the auth user.')
        } else {
          console.log('✅ Login successful! The super admin is working correctly.')
          await supabase.auth.signOut()
        }
        return
      } else {
        console.log('⚠️  Database record has auth_user_id but auth user doesn\'t exist. Will create new auth user.')
      }
    }

    console.log('🔧 Creating missing auth user...')

    // Create the auth user
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: existingUser.full_name,
        role: 'super_admin'
      }
    })

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message)
      
      if (authError.message.includes('already registered')) {
        console.log('🔍 Auth user already exists but not linked. Finding and linking...')
        
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const existingAuthUser = authUsers.users.find(u => u.email === adminEmail)
        
        if (existingAuthUser) {
          // Link the existing auth user to the database record
          const { error: updateError } = await supabase
            .from('users')
            .update({ auth_user_id: existingAuthUser.id })
            .eq('id', existingUser.id)

          if (updateError) {
            console.error('❌ Failed to link auth user:', updateError.message)
            return
          }

          console.log('✅ Successfully linked existing auth user to database record')
          
          // Test login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword
          })

          if (loginError) {
            console.log('❌ Login still failing:', loginError.message)
            console.log('You may need to reset the password in Supabase Dashboard')
          } else {
            console.log('✅ Login successful!')
            await supabase.auth.signOut()
          }
        }
      }
      return
    }

    console.log('✅ Auth user created successfully')

    // Update the database record with the new auth_user_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: newAuthUser.user.id })
      .eq('id', existingUser.id)

    if (updateError) {
      console.error('❌ Failed to link auth user to database record:', updateError.message)
      console.log('Auth user created but not linked. You may need to manually update the auth_user_id in the database.')
      return
    }

    console.log('✅ Successfully linked auth user to database record')

    // Test the login
    console.log('🧪 Testing login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    if (loginError) {
      console.error('❌ Login test failed:', loginError.message)
    } else {
      console.log('✅ Login test successful!')
      await supabase.auth.signOut()
    }

    console.log('\n🎉 Super Admin Setup Complete!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Password:', adminPassword)
    console.log('🌐 You can now login at: http://localhost:5173/login')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Run the script
createMissingAuthUser()