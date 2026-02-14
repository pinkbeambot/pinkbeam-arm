/**
 * Debug test for auth callback flow
 * Run this to verify the callback route is working correctly
 */

// Test the callback route with a mock code
async function testCallbackRoute() {
  console.log('Testing callback route...');
  
  // Make a request to the callback route with a fake code
  const response = await fetch('http://localhost:3000/auth/callback?code=fake_code');
  
  console.log('Status:', response.status);
  console.log('Headers:');
  response.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('set-cookie')) {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  // Check redirect location
  const location = response.headers.get('location');
  console.log('Redirect location:', location);
  
  if (location?.includes('error=auth_callback_failed')) {
    console.log('❌ Callback failed as expected (fake code)');
  }
}

// Test the session persistence
testCallbackRoute().catch(console.error);
