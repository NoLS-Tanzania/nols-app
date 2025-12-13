// Script to verify the property_reviews migration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('🔍 Verifying property_reviews table...\n');
    
    // Check if table exists
    const tableCheck = await prisma.$queryRawUnsafe(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        CREATE_TIME
      FROM information_schema.tables 
      WHERE table_schema = 'nolsaf' 
      AND table_name = 'property_reviews'
    `);
    
    if (!tableCheck || tableCheck.length === 0) {
      console.log('❌ Table "property_reviews" does not exist!');
      return;
    }
    
    console.log('✅ Table exists:', tableCheck[0]);
    console.log('');
    
    // Check table structure
    console.log('📋 Table Structure:');
    const columns = await prisma.$queryRawUnsafe(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM information_schema.columns
      WHERE table_schema = 'nolsaf'
      AND table_name = 'property_reviews'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(columns);
    console.log('');
    
    // Check indexes
    console.log('🔑 Indexes:');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM information_schema.statistics
      WHERE table_schema = 'nolsaf'
      AND table_name = 'property_reviews'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.table(indexes);
    console.log('');
    
    // Check foreign keys
    console.log('🔗 Foreign Keys:');
    const foreignKeys = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.key_column_usage
      WHERE table_schema = 'nolsaf'
      AND table_name = 'property_reviews'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (foreignKeys && foreignKeys.length > 0) {
      console.table(foreignKeys);
    } else {
      console.log('⚠ No foreign keys found (this might be expected)');
    }
    console.log('');
    
    // Check constraints
    console.log('⚙️  Constraints:');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM information_schema.table_constraints
      WHERE table_schema = 'nolsaf'
      AND table_name = 'property_reviews'
    `);
    
    console.table(constraints);
    console.log('');
    
    // Count rows (should be 0 for new table)
    const rowCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM property_reviews
    `);
    
    console.log('📊 Row Count:', rowCount[0]);
    console.log('');
    
    console.log('✅ Verification complete! Table structure looks correct.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
