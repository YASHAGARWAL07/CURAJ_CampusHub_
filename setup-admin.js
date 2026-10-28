#!/usr/bin/env node
'use strict';
const crypto=require('crypto'),readline=require('readline'),fs=require('fs'),path=require('path');
const {v4:uuidv4}=require('uuid');
const ENV=path.join(__dirname,'.env');
const sha256=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const ask=(rl,q)=>new Promise(r=>rl.question(q,r));
async function main(){
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      CU HUB — Admin Setup Wizard       ║');
  console.log('╚════════════════════════════════════════╝\n');
  if(fs.existsSync(ENV)){
    const rl0=readline.createInterface({input:process.stdin,output:process.stdout});
    const ans=await ask(rl0,'⚠️  .env already exists. Overwrite? (yes/no): ');
    rl0.close();
    if(ans.trim().toLowerCase()!=='yes'){console.log('\n✅  Cancelled.\n');process.exit(0);}
  }
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  const dbUrl=(await ask(rl,'  DATABASE_URL (PostgreSQL connection string): ')).trim();
  const username=(await ask(rl,'  Admin username (min 4 chars): ')).trim();
  const password=(await ask(rl,'  Admin password (min 10 chars): ')).trim();
  rl.close();
  if(!dbUrl||!dbUrl.startsWith('postgres')){console.error('❌  Invalid DATABASE_URL.');process.exit(1);}
  if(username.length<4){console.error('❌  Username too short.');process.exit(1);}
  if(password.length<10){console.error('❌  Password too short.');process.exit(1);}
  const token=uuidv4()+'-'+uuidv4();
  fs.writeFileSync(ENV,`# CU HUB — Generated ${new Date().toISOString()}
# NEVER commit this file.
PORT=3000
NODE_ENV=production
# ALLOWED_ORIGIN=https://your-app.onrender.com
DATABASE_URL=${dbUrl}
ADMIN_USER=${username}
ADMIN_PASS_HASH=${sha256(password)}
ADMIN_TOKEN_HASH=${sha256(token)}
# GEMINI_API_KEY=AIzaSy... (Get free key at https://aistudio.google.com/app/apikey)
`,{mode:0o600});
  console.log('\n✅  Done! Admin username: '+username);
  console.log('  Run: npm start\n');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
