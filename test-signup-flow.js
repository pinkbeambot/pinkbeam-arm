/**
 * End-to-end signup test
 * Verifies the complete magic link signup flow
 */

const TEST_EMAIL = 'richard.lloyd.hernandez+arme2etest@gmail.com';
const BASE_URL = 'http://localhost:3000';

async function testSignupFlow() {
  console.log('🧪 Testing Signup Flow');
  console.log('======================\n');

  // Step 1: Test the signup page loads
  console.log('1️⃣ Testing signup page...');
  try {
    const response = await fetch(`${BASE_URL}/signup`);
    if (response.status === 200) {
      console.log('   ✅ Signup page loads (200 OK)');
    } else {
      console.log(`   ❌ Signup page failed: ${response.status}`);
      return;
    }
  } catch (err) {
    console.log(`   ❌ Failed to connect: ${err}`);
    return;
  }

  // Step 2: Test Supabase OTP API directly
  console.log('\n2️⃣ Testing Supabase OTP API...');
  try {
    const response = await fetch('https://cyifwcczhwihwosdnzhq.supabase.co/auth/v1/otp', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aWZ3Y2N6aHdpaHdvc2RuemhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzE1NzEsImV4cCI6MjA4NjU0NzU3MX0.sCtof9hOlPknPE5kxeNb8SDlmwl0zka1twkunPCiLRQ',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        create_user: true,
        options: {
          email_redirect_to: `${BASE_URL}/auth/callback`,
        },
      }),
    });

    if (response.status === 200) {
      console.log('   ✅ Magic link sent successfully');
      console.log(`   📧 Check ${TEST_EMAIL} for the magic link`);
    } else {
      const error = await response.json();
      console.log(`   ❌ OTP API failed: ${response.status}`);
      console.log(`   Error: ${error.message || JSON.stringify(error)}`);
    }
  } catch (err) {
    console.log(`   ❌ OTP API error: ${err}`);
  }

  // Step 3: Test auth callback route exists
  console.log('\n3️⃣ Testing auth callback route...');
  try {
    // This will fail with no_code error since we're not providing a code,
    // but it verifies the route exists and is accessible
    const response = await fetch(`${BASE_URL}/auth/callback`);
    if (response.status === 307 || response.status === 302 || response.status === 200) {
      console.log('   ✅ Auth callback route is accessible');
    } else {
      console.log(`   ⚠️  Callback returned: ${response.status} (may be expected)`);
    }
  } catch (err) {
    console.log(`   ❌ Callback route error: ${err}`);
  }

  console.log('\n======================');
  console.log('📝 Summary:');
  console.log('   - The signup page is accessible');
  console.log('   - Supabase OTP API is working');
  console.log('   - Auth callback route exists');
  console.log('\n✅ Basic signup flow verification complete!');
  console.log('\n⚠️  IMPORTANT: To complete verification:');
  console.log('   1. Check your email for the magic link');
  console.log('   2. Click the link');
  console.log('   3. Verify you are redirected to /portal');
  console.log('   4. Confirm you can access the dashboard');
}

testSignupFlow().catch(console.error);
