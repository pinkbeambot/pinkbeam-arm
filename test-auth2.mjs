// Test script to verify Supabase server settings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyifwcczhwihwosdnzhq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aWZ3Y2N6aHdpaHdvc2RuemhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzE1NzEsImV4cCI6MjA4NjU0NzU3MX0.sCtof9hOlPknPE5kxeNb8SDlmwl0zka1twkunPCiLRQ';

async function testSettings() {
  console.log('Testing Supabase settings...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Try to get auth settings
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Get user result:', { user, error: userError?.message });
    
    // Try sign up with a more realistic email
    console.log('\nTesting with realistic email...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'richard@pinkbeam.ai',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    
    if (error) {
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
      console.error('Error status:', error.status);
      
      if (error.code === 'email_address_invalid') {
        console.log('\n🚨 DIAGNOSIS: Email provider is NOT enabled in Supabase Auth settings!');
        console.log('Go to Supabase Dashboard → Auth → Providers → Email → Enable Email provider');
      }
    } else {
      console.log('Success! Check your email.');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testSettings();
