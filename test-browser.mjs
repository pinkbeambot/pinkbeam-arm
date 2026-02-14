// Test script to simulate browser client
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://cyifwcczhwihwosdnzhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aWZ3Y2N6aHdpaHdvc2RuemhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzE1NzEsImV4cCI6MjA4NjU0NzU3MX0.sCtof9hOlPknPE5kxeNb8SDlmwl0zka1twkunPCiLRQ';

async function testBrowserClient() {
  console.log('Testing browser client...');
  
  try {
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    console.log('Browser client created successfully');
    
    // Test signInWithOtp
    console.log('\nAttempting signInWithOtp with browser client...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'richard@pinkbeam.ai',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    
    if (error) {
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
    } else {
      console.log('Success! OTP sent.');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testBrowserClient();
