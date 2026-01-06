// Script to run the property_reviews migration
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from '@nolsaf/prisma';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    const sqlPath = join(__dirname, '../prisma/migrations/add_property_reviews.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Remove comments and split by semicolons
    const cleanedSql = sql
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('--'))
      .join('\n');
    
    // Split by semicolons, but keep multi-line statements together
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Executing ${statements.length} SQL statement(s)...`);
    
    // Execute the entire SQL as one statement (CREATE TABLE with all constraints)
    try {
      await prisma.$executeRawUnsafe(cleanedSql);
      console.log('✓ Migration executed successfully');
    } catch (err) {
      // Check for specific error types
      const errorMsg = err.message || '';
      if (errorMsg.includes('already exists') || errorMsg.includes('Duplicate')) {
        console.log('⚠ Table already exists - migration may have already been applied');
        console.log('   Verifying table structure...');
        
        // Try to verify the table exists
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'nolsaf' 
          AND table_name = 'property_reviews'
        `);
        console.log('   Table exists:', tableCheck);
      } else {
        throw err;
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
