/**
 * Safely serialize Prisma objects to JSON-compatible format
 * Handles Date objects, BigInt, nested objects, and Prisma internal properties
 */
export function serializePrismaObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  const keys = Object.keys(obj);
  
  for (const key of keys) {
    try {
      const value = obj[key];
      
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        continue;
      }
      
      // Handle Dates
      if (value instanceof Date) {
        result[key] = value.toISOString();
      }
      // Handle BigInt
      else if (typeof value === 'bigint') {
        result[key] = value.toString();
      }
      // Handle null/undefined
      else if (value === null || value === undefined) {
        result[key] = value;
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        result[key] = value.map(v => serializePrismaObject(v));
      }
      // Handle nested objects (but skip Prisma internal properties)
      else if (typeof value === 'object') {
        // Skip Prisma internal properties
        if (key.startsWith('_') || key === 'toJSON' || key === 'toString') {
          continue;
        }
        try {
          result[key] = serializePrismaObject(value);
        } catch {
          // If nested object can't be serialized, skip it
          continue;
        }
      }
      // Handle primitives
      else {
        result[key] = value;
      }
    } catch (fieldError) {
      // Skip fields that can't be serialized
      continue;
    }
  }
  
  return result;
}

/**
 * Safely serialize a response object and test JSON serialization
 * Returns the serialized object or throws an error
 */
export function safeJsonResponse(data: any): any {
  const serialized = serializePrismaObject(data);
  // Test serialization
  JSON.stringify(serialized);
  return serialized;
}

