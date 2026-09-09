#!/usr/bin/env node
'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const PORT=Number(process.env.PORT||10000);
const HOST='0.0.0.0';
const GAME_HTML=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const rooms=new Map();
function json(res,code,body){const data=JSON.stringify(body);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(data)}
function validCode(code){return typeof code==='string'&&/^[ぁ-ゖァ-ヿ一-龯]{3}$/.test(code)}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>100000)req.destroy()});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})}
function getRoom(code){let room=rooms.get(code);if(!room){room={clients:new Map(),started:false};rooms.set(code,room)}return room}
function queue(room,exceptId,type,payload){for(const [id,c] of room.clients){if(id!==exceptId)c.messages.push({type,payload})}}
function maybeStart(room){if(room.clients.size!==2||room.started)return;const list=[...room.clients.values()];if(!list.every(c=>c.ready&&c.charKey))return;for(const c of list)c.messages.push({type:'bothReady',payload:{}})}
function startMatch(room){if(!room||room.clients.size!==2||room.started)return false;const list=[...room.clients.values()];if(!list.every(c=>c.ready&&c.charKey))return false;room.started=true;const players=list.map(c=>({slot:c.slot,key:c.charKey}));for(const c of list)c.messages.push({type:'matchStart',payload:{players}});return true}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end()}try{
if(req.method==='GET'&&u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(GAME_HTML)}
if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,rooms:rooms.size});
if(req.method==='POST'&&u.pathname==='/api/join'){const b=await readBody(req),code=String(b.code||'');if(!validCode(code))return json(res,400,{error:'日本語3文字のあいことばが必要です'});const room=getRoom(code);if(room.clients.size>=2)return json(res,409,{error:'その対戦室は満員です'});const id=crypto.randomBytes(12).toString('hex');const slot=room.clients.size+1;room.clients.set(id,{id,slot,room:code,messages:[],ready:false,charKey:null,lastSeen:Date.now()});if(room.clients.size===2)queue(room,null,'peerJoined',{slot});return json(res,200,{id,slot,room:code,players:room.clients.size})}
if(req.method==='GET'&&u.pathname==='/api/poll'){const code=String(u.searchParams.get('room')||''),id=String(u.searchParams.get('id')||''),room=rooms.get(code),client=room&&room.clients.get(id);if(!room||!client)return json(res,404,{error:'対戦室が見つかりません'});client.lastSeen=Date.now();const messages=client.messages.splice(0);return json(res,200,{messages,players:room.clients.size})}
if(req.method==='POST'&&u.pathname==='/api/message'){const b=await readBody(req),code=String(b.room||''),id=String(b.id||''),room=rooms.get(code),client=room&&room.clients.get(id);if(!room||!client)return json(res,404,{error:'対戦室が見つかりません'});client.lastSeen=Date.now();const type=String(b.type||''),payload=b.payload||{};
if(type==='char'){const key=String(payload.key||'');if(!['baba','mio','kawaoka','irie'].includes(key))return json(res,400,{error:'不正なキャラクター'});client.charKey=key;client.ready=false;room.started=false;queue(room,id,'peerChar',{key})}
else if(type==='ready'){const key=String(payload.charKey||client.charKey||'');if(!['baba','mio','kawaoka','irie'].includes(key))return json(res,400,{error:'キャラクターを選択してください'});client.charKey=key;client.ready=true;queue(room,id,'peerReady',{});maybeStart(room)}
else if(type==='start'){if(!startMatch(room))return json(res,409,{error:'両者の準備が完了していません'});}
else if(type==='input')queue(room,id,'input',payload);
else if(type==='leave'){room.clients.delete(id);queue(room,null,'peerLeft',{});if(room.clients.size===0)rooms.delete(code)}
return json(res,200,{ok:true})}
res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');
}catch(e){console.error(e);json(res,500,{error:'サーバー内部エラー'})}});
setInterval(()=>{const now=Date.now();for(const [code,room] of rooms){for(const [id,c] of room.clients)if(now-c.lastSeen>30000){room.clients.delete(id);queue(room,null,'peerLeft',{})}if(room.clients.size===0)rooms.delete(code)}},10000).unref();
server.listen(PORT,HOST,()=>console.log(`教室ファイターズ: listening on ${HOST}:${PORT}`));
