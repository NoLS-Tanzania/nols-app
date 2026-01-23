#!/usr/bin/env node
/**
 * Quick test script for health check endpoints
 * Run this after starting the API server
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:4000';

const endpoints = [
  { path: '/health', name: 'Health Check' },
  { path: '/ready', name: 'Readiness Check' },
  { path: '/live', name: 'Liveness Check' },
];

async function testEndpoint(path, name) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            name,
            path,
            status: res.statusCode,
            success: res.statusCode === 200 || res.statusCode === 503,
            data: json,
          });
        } catch (e) {
          resolve({
            name,
            path,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            data: data.substring(0, 100),
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject({
        name,
        path,
        error: err.message,
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({
        name,
        path,
        error: 'Request timeout',
      });
    });
  });
}

async function runTests() {
  console.log(`\n🧪 Testing Health Endpoints at ${API_URL}\n`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await testEndpoint(endpoint.path, endpoint.name);
      results.push(result);
      
      const icon = result.success ? '✅' : '⚠️';
      const statusColor = result.status === 200 ? 'green' : result.status === 503 ? 'yellow' : 'red';
      
      console.log(`\n${icon} ${result.name} (${result.path})`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
    } catch (error) {
      results.push({
        name: endpoint.name,
        path: endpoint.path,
        success: false,
        error: error.error || error.message,
      });
      
      console.log(`\n❌ ${endpoint.name} (${endpoint.path})`);
      console.log(`   Error: ${error.error || error.message}`);
      console.log(`   💡 Make sure the API server is running on ${API_URL}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Results: ${successCount}/${totalCount} endpoints responding\n`);
  
  if (successCount === totalCount) {
    console.log('✅ All health endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints failed. Check the API server status.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
