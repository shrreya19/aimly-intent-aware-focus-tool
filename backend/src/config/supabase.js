import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const IS_DEMO = process.env.DEMO_MODE === 'true';

let supabaseClient = null;
let isLiveSupabaseAvailable = false;

// Check if credentials are real / configured
const isConfigured =
  SUPABASE_URL &&
  SUPABASE_SERVICE_KEY &&
  !SUPABASE_URL.includes('your-project-ref') &&
  !SUPABASE_SERVICE_KEY.includes('your-supabase-service-role-key');

if (isConfigured) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    isLiveSupabaseAvailable = false; // set to true only upon verified connection in testSupabaseConnection()
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
    isLiveSupabaseAvailable = false;
  }
}

// In-memory fallback store for demo mode when Supabase is unconfigured/offline
const memoryStore = {
  users: new Map(),
  user_settings: new Map(),
  sessions: new Map(),
  page_visits: new Map(),
  feedback: new Map(),
  reward_events: new Map(),
};

/**
 * Startup health check for Supabase with 3s timeout
 */
export async function testSupabaseConnection() {
  console.log('\n======================================================');
  console.log('🔍 Testing Supabase Database Connection...');

  if (!isConfigured) {
    console.warn('⚠️  Notice: SUPABASE_URL or SUPABASE_SERVICE_KEY is not configured in backend/.env.');
    if (IS_DEMO) {
      console.log('💡 [DEMO_MODE=true] In-memory database fallback is ACTIVE.');
      console.log('   The app will run and function properly for demonstration.');
    }
    console.log('======================================================\n');
    isLiveSupabaseAvailable = false;
    return false;
  }

  try {
    // 3.5s timeout for initial connection check
    const checkPromise = supabaseClient.from('users').select('id').limit(1);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase connection timed out (3.5s)')), 3500)
    );

    const { data, error } = await Promise.race([checkPromise, timeoutPromise]);
    if (error) {
      if (error.code === '42P01') {
        console.error('⚠️  Connected to Supabase, but the "users" table does not exist!');
        console.error('   Please run "supabase/schema.sql" in your Supabase SQL Editor.');
      } else {
        console.error(`⚠️  Supabase error: [${error.code}] ${error.message}`);
      }
      if (IS_DEMO) {
        console.log('💡 Falling back to in-memory database store for smooth demo operation.');
      }
      console.log('======================================================\n');
      isLiveSupabaseAvailable = false;
      return false;
    }

    isLiveSupabaseAvailable = true;
    console.log('✅ Supabase connected successfully! Database tables verified.');
    console.log('======================================================\n');
    return true;
  } catch (err) {
    console.warn('⚠️  Could not reach Supabase:', err.message);
    if (IS_DEMO) {
      console.log('💡 [DEMO_MODE=true] Falling back to in-memory database store.');
    }
    console.log('======================================================\n');
    isLiveSupabaseAvailable = false;
    return false;
  }
}

export function isUsingLiveDb() {
  return isLiveSupabaseAvailable;
}

export function getSupabase() {
  return supabaseClient;
}

export { memoryStore };
