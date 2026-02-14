#!/usr/bin/env node
/**
 * Test script for Issue #145 - API 403/401 errors
 * Tests that API routes work correctly with service role client
 */

const BASE_URL = 'http://localhost:3000';

async function testAPIEndpoint(name, url) {
  console.log(`\nTesting ${name}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer invalid_token_for_testing',
      },
    });
    
    const data = await response.json().catch(() => null);
    
    console.log(`  Status: ${response.status}`);
    
    // 401 is expected for invalid token (endpoint working)
    // 403 would indicate tenant context/RLS issues
    // 500 would indicate server error
    if (response.status === 401) {
      console.log(`  ✅ Endpoint accessible (401 = auth required, not 403 RLS error)`);
      return { name, status: 'pass', code: 401 };
    } else if (response.status === 403) {
      console.log(`  ❌ Got 403 - RLS/tenant issue:`, data);
      return { name, status: 'fail', code: 403, error: data };
    } else if (response.status === 500) {
      console.log(`  ⚠️  Server error:`, data);
      return { name, status: 'error', code: 500, error: data };
    } else {
      console.log(`  ℹ️  Response:`, data);
      return { name, status: 'unknown', code: response.status };
    }
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    return { name, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('=== Issue #145 API Test ===');
  console.log('Testing API endpoints with invalid token...');
  console.log('Expected: 401 Unauthorized (endpoint working)');
  console.log('Problem: 403 Forbidden (RLS/tenant issue)');
  
  const endpoints = [
    ['/api/agents?limit=100', 'GET /api/agents'],
    ['/api/tasks?page=1&limit=100', 'GET /api/tasks'],
    ['/api/activities?limit=50', 'GET /api/activities'],
    ['/api/escalations?limit=20', 'GET /api/escalations'],
    ['/api/decisions?limit=20', 'GET /api/decisions'],
    ['/api/messages?limit=20', 'GET /api/messages'],
    ['/api/costs?limit=20', 'GET /api/costs'],
    ['/api/agent-templates?limit=20', 'GET /api/agent-templates'],
  ];
  
  const results = [];
  for (const [path, name] of endpoints) {
    const result = await testAPIEndpoint(name, `${BASE_URL}${path}`);
    results.push(result);
  }
  
  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  
  console.log(`Results: ${passed} passed, ${failed} failed, ${errors} errors / ${total} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed endpoints (403 errors):');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${JSON.stringify(r.error)}`);
    });
  }
  
  if (errors > 0) {
    console.log('\n⚠️  Endpoints with errors (500):');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  if (passed === total) {
    console.log('\n✅ All endpoints responding correctly (401, not 403)');
    console.log('Fix is working - no RLS/tenant context errors');
    process.exit(0);
  } else if (failed === 0 && errors === 0) {
    console.log('\n✅ No RLS errors detected');
    process.exit(0);
  } else {
    console.log('\n❌ Some endpoints still have issues');
    process.exit(1);
  }
}

main().catch(console.error);
