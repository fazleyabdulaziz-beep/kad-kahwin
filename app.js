const cfg = window.WEDDING_CONFIG || {};
const $ = id => document.getElementById(id);
const api = async (payload) => {
  if (!cfg.APPS_SCRIPT_URL) throw new Error("Sambungan RSVP belum disediakan.");
  const res = await fetch(cfg.APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify(payload)});
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Permintaan tidak berjaya.");
  return data;
};
$("openInvite").addEventListener("click", () => {
  $("cover").classList.add("hidden");
  $("site").style.display = "block";
  $("musicBtn").style.display = "grid";
  window.scrollTo(0,0);
  if (cfg.MUSIC_URL) {
    $("bgMusic").src = cfg.MUSIC_URL;
    $("bgMusic").play().then(()=>$("musicBtn").classList.add("playing")).catch(()=>{});
  }
});
$("musicBtn").addEventListener("click", async () => {
  const a=$("bgMusic"); if(!cfg.MUSIC_URL){alert("Masukkan MUSIC_URL dalam config.js dahulu.");return;}
  if(a.paused){try{await a.play();$("musicBtn").classList.add("playing");}catch(e){alert("Muzik tidak dapat dimainkan.");}}
  else{a.pause();$("musicBtn").classList.remove("playing");}
});
function countdown(){
 const target=new Date("2026-12-19T12:00:00+08:00").getTime(), now=Date.now(), diff=target-now;
 if(diff<=0){$("countdown").innerHTML="<p>Hari bahagia telah tiba. Alhamdulillah!</p>";return;}
 $("days").textContent=Math.floor(diff/86400000);
 $("hours").textContent=Math.floor(diff%86400000/3600000);
 $("mins").textContent=Math.floor(diff%3600000/60000);
 $("secs").textContent=Math.floor(diff%60000/1000);
}
countdown();setInterval(countdown,1000);
if(cfg.VENUE_NAME){$("venueText").textContent=cfg.VENUE_NAME;}
if(cfg.VENUE_ADDRESS){$("venueText").textContent=cfg.VENUE_NAME?cfg.VENUE_NAME+" — "+cfg.VENUE_ADDRESS:cfg.VENUE_ADDRESS;}
if(cfg.MAPS_URL){$("mapLink").href=cfg.MAPS_URL;$("mapLink").style.display="inline-block";}
$("rsvpForm").addEventListener("submit",async e=>{
 e.preventDefault();const b=e.submitter;b.disabled=true;b.textContent="Menghantar...";
 try{const f=new FormData(e.target);await api({action:"rsvp",name:f.get("name"),attendance:f.get("attendance"),guests:f.get("guests"),note:f.get("note")});$("rsvpStatus").textContent="Terima kasih! RSVP anda telah direkodkan.";e.target.reset();}
 catch(err){$("rsvpStatus").textContent=err.message;}
 finally{b.disabled=false;b.textContent="HANTAR RSVP";}
});
$("wishForm").addEventListener("submit",async e=>{
 e.preventDefault();const b=e.submitter;b.disabled=true;b.textContent="Menghantar...";
 try{const f=new FormData(e.target);await api({action:"wish",name:f.get("name"),message:f.get("message")});$("wishStatus").textContent="Terima kasih atas ucapan dan doa anda.";e.target.reset();loadWishes();}
 catch(err){$("wishStatus").textContent=err.message;}
 finally{b.disabled=false;b.textContent="KIRIM UCAPAN";}
});
async function loadWishes(){
 if(!cfg.APPS_SCRIPT_URL)return;
 try{const r=await fetch(cfg.APPS_SCRIPT_URL+"?action=wishes");const d=await r.json();if(d.ok&&d.wishes.length){$("wishes").style.display="block";$("wishes").innerHTML="<h3 class='serif'>Ucapan Tetamu</h3>"+d.wishes.map(w=>`<p style="border-top:1px solid #ddd8c8;padding:12px 0"><strong>${escapeHtml(w.name)}</strong><br>${escapeHtml(w.message)}</p>`).join("");}}
 catch(e){}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
loadWishes();