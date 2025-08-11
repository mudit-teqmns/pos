/**
 * Script to debug and fix super admin login issues
 * This will check both Supabase Auth and database records
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

async function debugSuperAdmin() {
  const adminEmail = 'admin@kitchenpos.com'
  const adminPassword = 'SuperAdmin123!'
  const adminName = 'Super Administrator'

  try {
    console.log('🔍 Debugging super admin login issue...\n')

    // 1. Check if auth user exists
    console.log('1. Checking Supabase Auth users...')
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw listError
    }

    const authUser = authUsers.users.find(u => u.email === adminEmail)
    
    if (authUser) {
      console.log('✅ Auth user found:', {
        id: authUser.id,
        email: authUser.email,
        email_confirmed: authUser.email_confirmed_at ? 'Yes' : 'No',
        created_at: authUser.created_at
      })
    } else {
      console.log('❌ Auth user NOT found')
    }

    // 2. Check database record
    console.log('\n2. Checking database users table...')
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)

    if (dbError) {
      throw dbError
    }

    if (dbUsers && dbUsers.length > 0) {
      console.log('✅ Database user(s) found:')
      dbUsers.forEach(user => {
        console.log({
          id: user.id,
          auth_user_id: user.auth_user_id,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        })
      })
    } else {
      console.log('❌ Database user NOT found')
    }

    // 3. Test login attempt
    console.log('\n3. Testing login attempt...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    if (loginError) {
      console.log('❌ Login failed:', loginError.message)
    } else {
      console.log('✅ Login successful!')
      await supabase.auth.signOut()
    }

    // 4. Fix issues if found
    console.log('\n4. Attempting to fix issues...')

    if (!authUser) {
      console.log('Creating missing auth user...')
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminName,
          role: 'super_admin'
        }
      })

      if (createError) {
        throw createError
      }

      console.log('✅ Auth user created')

      // Create database record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: newAuthUser.user.id,
          email: adminEmail,
          full_name: adminName,
          role: 'super_admin',
          restaurant_id: null,
          is_active: true
        })

      if (insertError) {
        throw insertError
      }

      console.log('✅ Database record created')
    } else if (dbUsers.length === 0) {
      console.log('Creating missing database record...')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUser.id,
          email: adminEmail,
          full_name: adminName,
          role: 'super_admin',
          restaurant_id: null,
          is_active: true
        })

      if (insertError) {
        throw insertError
      }

      console.log('✅ Database record created')
    } else if (dbUsers.length > 0 && !dbUsers[0].auth_user_id) {
      console.log('Linking database record to auth user...')
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUser.id })
        .eq('email', adminEmail)
        .eq('role', 'super_admin')

      if (updateError) {
        throw updateError
      }

      console.log('✅ Database record linked to auth user')
    } else if (authUser && !authUser.email_confirmed_at) {
      console.log('Confirming email for auth user...')
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { email_confirm: true }
      )

      if (confirmError) {
        throw confirmError
      }

      console.log('✅ Email confirmed')
    }

    // 5. Final test
    console.log('\n5. Final login test...')
    const { data: finalLoginData, error: finalLoginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    if (finalLoginError) {
      console.log('❌ Login still failing:', finalLoginError.message)
      console.log('\n🔧 Manual steps required:')
      console.log('1. Go to your Supabase Dashboard > Authentication > Users')
      console.log('2. Check if admin@kitchenpos.com exists')
      console.log('3. If it exists, make sure email is confirmed')
      console.log('4. If it doesn\'t exist, create it manually with password: SuperAdmin123!')
      console.log('5. Then run this script again')
    } else {
      console.log('✅ Login successful!')
      await supabase.auth.signOut()
      
      console.log('\n🎉 Super Admin Login Fixed!')
      console.log('📧 Email: admin@kitchenpos.com')
      console.log('🔑 Password: SuperAdmin123!')
      console.log('🌐 You can now login at: http://localhost:5173/login')
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message)
    console.log('\n🔧 Manual fix required:')
    console.log('1. Go to Supabase Dashboard > Authentication > Users')
    console.log('2. Delete any existing admin@kitchenpos.com user')
    console.log('3. Go to SQL Editor and run:')
    console.log('   DELETE FROM users WHERE email = \'admin@kitchenpos.com\';')
    console.log('4. Run this script again')
  }
}

// Run the script
debugSuperAdmin()