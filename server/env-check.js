'use strict';
const fs=require('fs'),path=require('path');
const envPath=path.join(__dirname,'..', '.env');
if(fs.existsSync(envPath)){
  fs.readFileSync(envPath,'utf8').split('\n').forEach(line=>{
    const t=line.trim();if(!t||t.startsWith('#'))return;
    const i=t.indexOf('=');if(i<0)return;
    const k=t.slice(0,i).trim(),v=t.slice(i+1).trim().replace(/^["']|["']$/g,'');
    if(k&&!process.env[k])process.env[k]=v;
  });
}
const missing=['DATABASE_URL','ADMIN_USER','ADMIN_PASS_HASH'].filter(k=>!process.env[k]);
if(missing.length){
  console.error('\n❌  Missing env vars:',missing.join(', '));
  console.error('👉  Run: node setup-admin.js\n');
  process.exit(1);
}
