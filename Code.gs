const SHEET_RSVP = "RSVP";
const SHEET_WISHES = "Guestbook";
function setup(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss,SHEET_RSVP,["Timestamp","Name","Attendance","Guests","Note"]);
  ensureSheet(ss,SHEET_WISHES,["Timestamp","Name","Message"]);
}
function ensureSheet(ss,name,headers){
  let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);
  if(sh.getLastRow()===0)sh.appendRow(headers);
}
function doPost(e){
  try{
    const data=JSON.parse(e.postData.contents||"{}");
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    if(data.action==="rsvp"){
      const sh=ss.getSheetByName(SHEET_RSVP);if(!sh)throw new Error("Run setup() first.");
      const name=clean(data.name), attendance=clean(data.attendance), guests=Math.max(1,Math.min(20,Number(data.guests)||1)), note=clean(data.note);
      if(!name||!["Hadir","Tidak dapat hadir"].includes(attendance))throw new Error("Maklumat RSVP tidak lengkap.");
      sh.appendRow([new Date(),name,attendance,guests,note]);
      return json({ok:true});
    }
    if(data.action==="wish"){
      const sh=ss.getSheetByName(SHEET_WISHES);if(!sh)throw new Error("Run setup() first.");
      const name=clean(data.name),message=clean(data.message);
      if(!name||!message)throw new Error("Nama dan ucapan diperlukan.");
      sh.appendRow([new Date(),name,message]);
      return json({ok:true});
    }
    throw new Error("Action tidak dikenali.");
  }catch(err){return json({ok:false,error:err.message});}
}
function doGet(e){
  if(e.parameter.action==="wishes"){
    const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_WISHES);
    if(!sh)return json({ok:true,wishes:[]});
    const rows=sh.getDataRange().getValues().slice(1).slice(-30).reverse();
    return json({ok:true,wishes:rows.map(r=>({name:String(r[1]),message:String(r[2])}))});
  }
  return json({ok:true,message:"Wedding invitation API is ready."});
}
function clean(v){return String(v||"").trim().slice(0,500);}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
