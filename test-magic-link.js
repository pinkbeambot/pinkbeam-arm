// Test script to verify Supabase magic link signup
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyifwcczhwihwosdnzhq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aWZ3Y2N6aHdpaHdvc2RuemhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzE1NzEsImV4cCI6MjA4NjU0NzU3MX0.sCtof9hOlPknPE5kxeNb8SDlmwl0zka1twkunPCiLRQ';

async function testMagicLink() {
  console.log('Testing Supabase magic link configuration...');
  console.log('URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test with a valid email format
  const testEmail = `richard.lloyd.hernandez+test${Date.now()}@gmail.com`;
  
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    
    if (error) {
      console.error('Error sending magic link:', error.message);
      console.error('Error code:', error.code);
      console.error('Error status:', error.status);
      return;
    }
    
    console.log('Magic link sent successfully!');
    console.log('Response data:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testMagicLink();
