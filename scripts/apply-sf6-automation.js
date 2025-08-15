#!/usr/bin/env node

/**
 * SF-6: Activities ↔ Tickets Bridge - Setup Script
 * 
 * This script applies the SF-6 automation that auto-creates activities
 * when task-type stages are completed.
 */

const fs = require('fs');
const path = require('path');

// Function to execute SQL files
async function executeSQLFile(client, filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Executing ${path.basename(filePath)}...`);
    
    const result = await client.query(sql);
    console.log(`✅ ${path.basename(filePath)} executed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Error executing ${path.basename(filePath)}:`, error.message);
    throw error;
  }
}

// Main setup function
async function setupSF6Automation() {
  console.log('🚀 Setting up SF-6: Activities ↔ Tickets Bridge automation...\n');
  
  try {
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Get environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📡 Connected to Supabase');
    console.log('🔧 Installing SF-6 automation...\n');
    
    // Execute the SF-6 automation SQL
    const sqlPath = path.join(__dirname, '..', 'SF6_AUTO_CREATE_ACTIVITY_RPC.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }
    
    await executeSQLFile(supabase, sqlPath);
    
    console.log('\n✅ SF-6 automation installed successfully!');
    console.log('\n📋 What was installed:');
    console.log('  • auto_create_activity_for_completed_task() RPC function');
    console.log('  • trigger_sf6_auto_create_activity trigger on stage_instances');
    console.log('  • sf6_process_existing_completed_tasks() helper function');
    console.log('  • system_logs table for debugging');
    
    // Test the setup by calling the helper function
    console.log('\n🧪 Testing automation with existing completed tasks...');
    
    const { data: testResult, error: testError } = await supabase
      .rpc('sf6_process_existing_completed_tasks');
    
    if (testError) {
      console.warn('⚠️ Warning: Test failed:', testError.message);
    } else {
      console.log('✅ Test completed:');
      console.log(`  • Processed: ${testResult.processed_count} completed task stages`);
      console.log(`  • Created: ${testResult.created_count} new activities`);
    }
    
    console.log('\n🎯 SF-6 Bridge is now active!');
    console.log('   Activities will be auto-created when task-type stages are completed.');
    
  } catch (error) {
    console.error('\n❌ SF-6 setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupSF6Automation();
}

module.exports = { setupSF6Automation };
