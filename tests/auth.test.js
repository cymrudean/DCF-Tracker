import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig,serviceError} from '../auth.js';
test('auth fails closed with missing, insecure or secret configuration',()=>{
 for(const c of [{},{supabaseUrl:'http://test.supabase.co',publishableKey:'sb_publishable_1234567890'},{supabaseUrl:'https://test.supabase.co.evil.test',publishableKey:'sb_publishable_1234567890'},{supabaseUrl:'https://test.supabase.co',publishableKey:'sb_secret_1234567890'}])assert.equal(validateConfig(c),false);
 const jwt='a.'+btoa(JSON.stringify({role:'service_role'}))+'.b';assert.equal(validateConfig({supabaseUrl:'https://test.supabase.co',publishableKey:jwt}),false);
 assert.equal(validateConfig({supabaseUrl:'https://test.supabase.co',publishableKey:'sb_publishable_1234567890'}),true);
});

test('service errors distinguish missing schema, permissions and expired sessions without exposing server payloads',()=>{
 assert.match(serviceError(404,'PGRST205'),/tables are missing/);
 assert.match(serviceError(403,'42501'),/permission denied/);
 assert.match(serviceError(500,'42P17'),/recursion/);
 assert.match(serviceError(401,''),/session or project key/);
 assert.match(serviceError(500,'XX000'),/HTTP 500; XX000/);
});
