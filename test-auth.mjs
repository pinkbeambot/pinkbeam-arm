// Test script to verify Supabase auth configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyifwcczhwihwosdnzhq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aWZ3Y2N6aHdpaHdvc2RuemhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzE1NzEsImV4cCI6MjA4NjU0NzU3MX0.sCtof9hOlPknPE5kxeNb8SDlmwl0zka1twkunPCiLRQ';

async function testAuth() {
  console.log('Testing Supabase Auth...');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key present:', !!supabaseAnonKey);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test signInWithOtp
    console.log('\nAttempting signInWithOtp...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    
    if (error) {
      console.error('Error:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('Success! Data:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testAuth();
