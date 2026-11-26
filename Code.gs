/** Wedding SaaS MVP — Google Apps Script backend.
 * 1) Create a Google Sheet, bind this script to it.
 * 2) Set Script Properties: PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD.
 * 3) Run setup() once, then deploy as Web App (Execute as: Me; Access: Anyone).
 */
const T = { USERS:'Users', WEDDINGS:'Weddings', SESSIONS:'Sessions', RSVP:'RSVP', WISHES:'Guestbook' };
const SESSION_HOURS = 24 * 7;

function setup(){
  const ss=SpreadsheetApp.getActive();
  ensure_(ss,T.USERS,['user_id','email','password_hash','salt','role','created_at','active']);
  ensure_(ss,T.WEDDINGS,['wedding_id','slug','owner_id','title','draft_json','published_json','status','created_at','updated_at']);
  ensure_(ss,T.SESSIONS,['token_hash','user_id','expires_at','created_at']);
  ensure_(ss,T.RSVP,['wedding_id','created_at','name','attendance','guests','note']);
  ensure_(ss,T.WISHES,['wedding_id','created_at','name','message','approved']);
  const props=PropertiesService.getScriptProperties();
  const email=(props.getProperty('PLATFORM_ADMIN_EMAIL')||'').trim().toLowerCase();
  const password=props.getProperty('PLATFORM_ADMIN_PASSWORD')||'';
  if(email&&password&&!findUser_(email)){
    const salt=Utilities.getUuid();
    sheet_(T.USERS).appendRow([Utilities.getUuid(),email,hash_(password,salt),salt,'platform_admin',new Date(),true]);
  }
  return 'Setup complete. Configure Script Properties and run setup again to create the platform admin.';
}
function doPost(e){
  try{
    const d=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const a=d.action;
    if(a==='login') return out_(login_(d));
    if(a==='publicWedding') return out_(publicWedding_(d.slug));
    if(a==='rsvp') return out_(saveRsvp_(d));
    if(a==='wish') return out_(saveWish_(d));
    if(a==='publicWishes') return out_(publicWishes_(d.slug));
    const user=auth_(d.token);
    if(a==='me') return out_({ok:true,user:{email:user.email,role:user.role}});
    if(a==='listWeddings') return out_(listWeddings_(user));
    if(a==='getWedding') return out_(getWedding_(user,d));
    if(a==='createWedding') return out_(createWedding_(user,d));
    if(a==='saveDraft') return out_(saveDraft_(user,d));
    if(a==='publish') return out_(publish_(user,d));
    if(a==='logout'){revokeSession_(d.token);return out_({ok:true});}
    throw new Error('Action tidak dikenali.');
  }catch(err){return out_({ok:false,error:String(err.message||err)});}
}
function login_(d){
  const email=String(d.email||'').trim().toLowerCase(), password=String(d.password||'');
  const u=findUser_(email);
  if(!u||!u.active||hash_(password,u.salt)!==u.password_hash) throw new Error('Email atau kata laluan tidak tepat.');
  const token=Utilities.getUuid()+Utilities.getUuid();
  sheet_(T.SESSIONS).appendRow([hash_(token,'session'),u.user_id,new Date(Date.now()+SESSION_HOURS*3600000),new Date()]);
  return {ok:true,token,user:{email:u.email,role:u.role}};
}
function revokeSession_(token){if(!token)return;const sh=sheet_(T.SESSIONS),rows=sh.getDataRange().getValues(),wanted=hash_(String(token),'session');for(let i=rows.length-1;i>=1;i--)if(rows[i][0]===wanted){sh.deleteRow(i+1);break;}}
function auth_(token){
  if(!token) throw new Error('Sesi tamat. Sila log masuk semula.');
  const sh=sheet_(T.SESSIONS), rows=sh.getDataRange().getValues(), wanted=hash_(String(token),'session');
  for(let i=1;i<rows.length;i++) if(rows[i][0]===wanted&&new Date(rows[i][2]).getTime()>Date.now()){
    const u=findUserById_(rows[i][1]); if(u&&u.active)return u;
  }
  throw new Error('Sesi tidak sah atau telah tamat.');
}
function createWedding_(user,d){
  const email=String(d.ownerEmail||user.email).trim().toLowerCase();
  let owner=findUser_(email);
  if(!owner){
    if(user.role!=='platform_admin') throw new Error('Hanya platform admin boleh mencipta akaun pemilik baharu.');
    const pass=String(d.ownerPassword||''); if(pass.length<10) throw new Error('Kata laluan pemilik mesti sekurang-kurangnya 10 aksara.');
    const salt=Utilities.getUuid(); owner={user_id:Utilities.getUuid(),email,password_hash:hash_(pass,salt),salt,role:'wedding_owner',active:true};
    sheet_(T.USERS).appendRow([owner.user_id,email,owner.password_hash,salt,owner.role,new Date(),true]);
  }
  if(user.role!=='platform_admin'&&owner.user_id!==user.user_id) throw new Error('Tidak dibenarkan.');
  const slug=slugify_(d.slug||d.title||'wedding');
  if(findWeddingBySlug_(slug)) throw new Error('Slug sudah digunakan. Pilih URL lain.');
  const weddingId=Utilities.getUuid();
  const content=defaultContent_(d.title||'Wedding Invitation',slug);
  content.groomName=String(d.groomName||'').trim(); content.brideName=String(d.brideName||'').trim();
  const sh=sheet_(T.WEDDINGS); sh.appendRow([weddingId,slug,owner.user_id,content.title,JSON.stringify(content),'','draft',new Date(),new Date()]);
  return {ok:true,wedding:{id:weddingId,slug,title:content.title,status:'draft'},owner:{email,temporaryPassword:d.ownerPassword||null}};
}
function listWeddings_(user){
  const rows=sheet_(T.WEDDINGS).getDataRange().getValues().slice(1);
  return {ok:true,weddings:rows.filter(r=>user.role==='platform_admin'||r[2]===user.user_id).map(r=>({id:r[0],slug:r[1],title:r[3],status:r[6],updatedAt:r[8]}))};
}
function getWedding_(user,d){const row=findWedding_(d.weddingId);assertAccess_(user,row);return {ok:true,wedding:{id:row.wedding_id,slug:row.slug,title:row.title,status:row.status,content:JSON.parse(row.draft_json||'{}')}};}
function saveDraft_(user,d){
  const row=findWedding_(d.weddingId); assertAccess_(user,row);
  const content=validateContent_(d.content);
  const sh=sheet_(T.WEDDINGS); const collision=findWeddingBySlug_(content.slug); if(collision&&collision.wedding_id!==row.wedding_id)throw new Error('Slug sudah digunakan oleh wedding lain.');
  sh.getRange(row.row,2).setValue(content.slug); sh.getRange(row.row,4).setValue(content.title||'Wedding Invitation');
  sh.getRange(row.row,5).setValue(JSON.stringify(content)); sh.getRange(row.row,9).setValue(new Date());
  return {ok:true,content};
}
function publish_(user,d){
  const row=findWedding_(d.weddingId); assertAccess_(user,row);
  const sh=sheet_(T.WEDDINGS); const draft=JSON.parse(sh.getRange(row.row,5).getValue()||'{}');
  sh.getRange(row.row,6).setValue(JSON.stringify(draft)); sh.getRange(row.row,7).setValue('published'); sh.getRange(row.row,9).setValue(new Date());
  return {ok:true,slug:row.slug};
}
function publicWedding_(slug){
  const row=findWeddingBySlug_(slug); if(!row||row.status!=='published'||!row.published_json) throw new Error('Jemputan tidak dijumpai atau belum diterbitkan.');
  return {ok:true,wedding:JSON.parse(row.published_json),slug:row.slug};
}
function saveRsvp_(d){
  const row=findPublished_(d.slug); const name=clean_(d.name,100), attendance=String(d.attendance||'');
  if(!name||!['Hadir','Tidak dapat hadir'].includes(attendance))throw new Error('Sila lengkapkan RSVP.');
  const guests=Math.max(1,Math.min(20,Number(d.guests)||1));
  sheet_(T.RSVP).appendRow([row.wedding_id,new Date(),name,attendance,guests,clean_(d.note,500)]);
  return {ok:true};
}
function saveWish_(d){
  const row=findPublished_(d.slug),name=clean_(d.name,100),message=clean_(d.message,500);
  if(!name||!message)throw new Error('Nama dan ucapan diperlukan.');
  sheet_(T.WISHES).appendRow([row.wedding_id,new Date(),name,message,true]); return {ok:true};
}
function publicWishes_(slug){
  const row=findPublished_(slug), rows=sheet_(T.WISHES).getDataRange().getValues().slice(1).filter(r=>r[0]===row.wedding_id&&r[4]===true).slice(-30).reverse();
  return {ok:true,wishes:rows.map(r=>({name:r[2],message:r[3]}))};
}
function findPublished_(slug){const r=findWeddingBySlug_(slug);if(!r||r.status!=='published')throw new Error('Jemputan belum diterbitkan.');return r;}
function assertAccess_(u,r){if(!r)throw new Error('Wedding tidak dijumpai.');if(u.role!=='platform_admin'&&r.owner_id!==u.user_id)throw new Error('Anda tiada akses kepada wedding ini.');}
function findWedding_(id){const rows=sheet_(T.WEDDINGS).getDataRange().getValues();for(let i=1;i<rows.length;i++)if(rows[i][0]===id)return rowObj_(rows[i],i+1);return null;}
function findWeddingBySlug_(slug){const rows=sheet_(T.WEDDINGS).getDataRange().getValues();for(let i=1;i<rows.length;i++)if(rows[i][1]===slug)return rowObj_(rows[i],i+1);return null;}
function rowObj_(r,n){return {row:n,wedding_id:r[0],slug:r[1],owner_id:r[2],title:r[3],draft_json:r[4],published_json:r[5],status:r[6]};}
function findUser_(email){const rows=sheet_(T.USERS).getDataRange().getValues();for(let i=1;i<rows.length;i++)if(String(rows[i][1]).toLowerCase()===email)return userObj_(rows[i]);return null;}
function findUserById_(id){const rows=sheet_(T.USERS).getDataRange().getValues();for(let i=1;i<rows.length;i++)if(rows[i][0]===id)return userObj_(rows[i]);return null;}
function userObj_(r){return {user_id:r[0],email:r[1],password_hash:r[2],salt:r[3],role:r[4],active:r[6]===true};}
function defaultContent_(title,slug){return {title,slug,groomName:'',brideName:'',eventDate:'2026-12-19',eventTime:'',venueName:'',venueAddress:'',mapsUrl:'',openingText:'Dengan izin Allah SWT, kami menjemput anda meraikan hari bahagia kami.',welcomeText:'Dengan penuh rasa kesyukuran ke hadrat Ilahi, kami ingin menjemput tuan/puan sekeluarga untuk bersama-sama meraikan hari bahagia kami. Kehadiran dan doa restu anda amat kami hargai.',invitationText:'Kehadiran dan doa restu anda amat kami hargai.',musicUrl:'',gallery:[],theme:{forest:'#294637',sage:'#71866c',cream:'#f7f3e9',gold:'#b99b60'}};}
function validateContent_(c){if(!c||typeof c!=='object')throw new Error('Kandungan tidak sah.');const out=defaultContent_(clean_(c.title,120),slugify_(c.slug||'wedding'));['groomName','brideName','eventDate','eventTime','venueName','venueAddress','mapsUrl','openingText','welcomeText','invitationText','musicUrl'].forEach(k=>out[k]=clean_(c[k],k==='welcomeText'||k==='invitationText'?1200:500));out.gallery=Array.isArray(c.gallery)?c.gallery.slice(0,12).map(x=>clean_(x,1000)):[];if(c.theme&&typeof c.theme==='object')Object.keys(out.theme).forEach(k=>{if(/^#[0-9a-fA-F]{6}$/.test(c.theme[k]||''))out.theme[k]=c.theme[k];});return out;}
function ensure_(ss,n,h){let s=ss.getSheetByName(n);if(!s)s=ss.insertSheet(n);if(!s.getLastRow())s.appendRow(h);}
function sheet_(n){const s=SpreadsheetApp.getActive().getSheetByName(n);if(!s)throw new Error('Run setup() first. Missing '+n);return s;}
function hash_(v,s){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)+'|'+String(v));return bytes.map(b=>(b+256).toString(16).slice(-2)).join('');}
function slugify_(v){return String(v||'wedding').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'wedding';}
function clean_(v,max){return String(v==null?'':v).trim().slice(0,max||500);}
function publicUrl_(slug){return ScriptApp.getService().getUrl().replace(/\/exec$/,'')+'/exec?slug='+encodeURIComponent(slug);}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}

function seedFazleyWedding(){
  const adminEmail=(PropertiesService.getScriptProperties().getProperty('PLATFORM_ADMIN_EMAIL')||'').trim().toLowerCase();
  const admin=findUser_(adminEmail); if(!admin||admin.role!=='platform_admin')throw new Error('Configure and create platform admin first.');
  if(findWeddingBySlug_('fazley-roslina'))return 'Fazley & Roslina wedding already exists.';
  const c=defaultContent_('Fazley & Roslina Wedding','fazley-roslina');
  c.groomName='Fazley Abdul Aziz';c.brideName='Roslina binti Abdullah';c.eventDate='2026-12-19';c.mapsUrl='https://maps.app.goo.gl/1Kaq9crVWYeptPJC9';c.musicUrl='./wedding-music.mp3';
  c.openingText='Dengan izin Allah SWT, kami menjemput Dato’/Datin/Tuan/Puan/Encik/Cik seisi keluarga ke majlis perkahwinan kami.';
  c.welcomeText='Dengan penuh rasa kesyukuran ke hadrat Ilahi, kami ingin menjemput tuan/puan sekeluarga untuk bersama-sama meraikan hari bahagia kami. Kehadiran dan doa restu anda amat kami hargai.';
  c.invitationText='Terima kasih atas kesudian hadir dan menitipkan doa.';
  sheet_(T.WEDDINGS).appendRow([Utilities.getUuid(),'fazley-roslina',admin.user_id,c.title,JSON.stringify(c),'','draft',new Date(),new Date()]);
  return 'Starter wedding created as draft. Sign in with platform admin to edit and publish.';
}
