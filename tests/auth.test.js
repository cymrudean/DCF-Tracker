import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig} from '../auth.js';
test('auth fails closed with missing, insecure or secret configuration',()=>{
 for(const c of [{},{supabaseUrl:'http://test.supabase.co',publishableKey:'sb_publishable_1234567890'},{supabaseUrl:'https://test.supabase.co.evil.test',publishableKey:'sb_publishable_1234567890'},{supabaseUrl:'https://test.supabase.co',publishableKey:'sb_secret_1234567890'}])assert.equal(validateConfig(c),false);
 const jwt='a.'+btoa(JSON.stringify({role:'service_role'}))+'.b';assert.equal(validateConfig({supabaseUrl:'https://test.supabase.co',publishableKey:jwt}),false);
 assert.equal(validateConfig({supabaseUrl:'https://test.supabase.co',publishableKey:'sb_publishable_1234567890'}),true);
});
