# Redis Configuration Guide

## Migration Status
✅ Database migration successfully applied:
- Composite index added: `PropertyImage_propertyId_status_createdAt_idx`
- This will significantly improve query performance

## Redis Configuration

### Current Configuration
- **REDIS_URL**: `redis://localhost:6379` (configured in `apps/api/.env`)

### Installation Options for Windows

#### Option 1: Redis for Windows (Recommended for Development)
1. **Download Redis for Windows**:
   - Official: https://github.com/microsoftarchive/redis/releases
   - Or use WSL2 with Redis (recommended for better compatibility)

#### Option 2: Using WSL2 (Recommended)
```bash
# In WSL2 Ubuntu terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

#### Option 3: Docker (Easiest)
```bash
# Run Redis in Docker container
docker run -d --name redis-nolsaf -p 6379:6379 redis:7-alpine

# To stop:
docker stop redis-nolsaf

# To start again:
docker start redis-nolsaf
```

#### Option 4: Memurai (Windows-native Redis alternative)
- Download from: https://www.memurai.com/
- Free for development use
- Windows service, easy to manage

### Verify Redis is Running

#### Test Connection (Node.js)
```bash
cd apps/api
node -e "const Redis = require('ioredis'); const r = new Redis('redis://localhost:6379'); r.ping().then(console.log).catch(console.error); r.quit();"
```

#### Test with redis-cli (if installed)
```bash
redis-cli ping
# Should return: PONG
```

### Configuration

The Redis client is already configured in `apps/api/src/lib/redis.ts` with:
- ✅ Connection timeout: 5 seconds
- ✅ Retry strategy with exponential backoff
- ✅ Automatic reconnection on failure
- ✅ Graceful fallback when Redis is unavailable

### Environment Variables

Make sure your `apps/api/.env` file contains:
```env
REDIS_URL=redis://localhost:6379
```

For production or remote Redis:
```env
REDIS_URL=redis://username:password@host:port
# Or for Redis with TLS:
REDIS_URL=rediss://username:password@host:port
```

### Monitoring

Once Redis is running, the API will automatically:
1. Connect on startup
2. Log connection status in console:
   - `[REDIS] Connected successfully`
   - `[REDIS] Ready to accept commands`
3. Fall back gracefully if Redis is unavailable (no blocking)

### Performance Improvements

With Redis enabled:
- **Cached requests**: ~50-200ms (from cache)
- **Cache miss**: ~1-2s (optimized query with index)

Without Redis:
- **All requests**: ~1-2s (optimized query with index)

The new composite index ensures fast queries even when Redis is unavailable.

### Troubleshooting

#### Redis connection refused
```
[REDIS] Connection error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis server using one of the installation options above.

#### Redis not responding
- Check if Redis is running: `netstat -an | findstr 6379` (Windows)
- Verify port is not blocked by firewall
- Check Redis logs for errors

#### Connection timeout
- The client has a 5-second timeout
- If Redis is slow to start, wait a few seconds and restart the API server

### Next Steps

1. **Install Redis** using one of the options above
2. **Start Redis server**
3. **Restart your API server** to connect to Redis
4. **Monitor logs** to see Redis connection status
5. **Test the endpoint**: `/api/public/properties/4` should be much faster now

The application will work without Redis (with optimized queries), but caching will significantly improve performance for repeated requests.
