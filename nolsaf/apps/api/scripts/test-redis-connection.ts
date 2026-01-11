import { getRedis } from '../src/lib/redis.js';

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...\n');
  
  const redis = getRedis();
  
  if (!redis) {
    console.error('❌ Failed to get Redis client');
    process.exit(1);
  }
  
  try {
    console.log(`⏳ Current status: ${redis.status}`);
    console.log('⏳ Connecting on first command (lazy connect)...');
    
    // With lazyConnect: true, connection happens automatically on first command
    // Test ping - this will trigger the connection
    const pingResult = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
    ]) as string;
    
    console.log(`✅ Redis client status: ${redis.status}`);
    console.log(`✅ PING: ${pingResult}`);
    
    // Test set/get
    const testKey = 'test:connection';
    const testValue = `test-${Date.now()}`;
    
    await redis.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds
    console.log(`✅ SET: ${testKey} = ${testValue}`);
    
    const retrievedValue = await redis.get(testKey);
    console.log(`✅ GET: ${testKey} = ${retrievedValue}`);
    
    if (retrievedValue === testValue) {
      console.log('\n✅ Redis connection verified successfully!');
      
      // Clean up
      await redis.del(testKey);
      await redis.quit();
      
      process.exit(0);
    } else {
      console.error(`\n❌ Value mismatch! Expected: ${testValue}, Got: ${retrievedValue}`);
      await redis.quit().catch(() => {});
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Redis connection failed:`, error.message);
    if (redis && typeof redis.quit === 'function') {
      try {
        await redis.quit();
      } catch {
        // Ignore quit errors
      }
    }
    process.exit(1);
  }
}

testRedisConnection();
