const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const LANGS={es:["Spanish","es-ES"],fr:["French","fr-FR"],de:["German","de-DE"],it:["Italian","it-IT"],pt:["Portuguese","pt-PT"],nl:["Dutch","nl-NL"],sv:["Swedish","sv-SE"],da:["Danish","da-DK"],pl:["Polish","pl-PL"],tr:["Turkish","tr-TR"],ru:["Russian","ru-RU"],ja:["Japanese","ja-JP"],ko:["Korean","ko-KR"],zh:["Chinese","zh-CN"],ar:["Arabic","ar-SA"],hi:["Hindi","hi-IN"],el:["Greek","el-GR"],la:["Latin","it-IT"],en:["English","en-US"]};
Object.assign(LANGS,get("customLangs",{}));
let LANG=localStorage.getItem("lang");if(!LANGS[LANG])LANG="es";
const LN=()=>LANGS[LANG][0];
const PAGES=[["index","Dashboard"],["journal","Journal"],["creative-studio","Creative Studio"],["vocabulary","Vocabulary"],["tutor","AI Tutor"],["progress","Progress"]];
const dayKey=(o=0)=>{const d=new Date();d.setDate(d.getDate()-o);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const bump=(k,n=1)=>{const a=get("activity",{}),t=a[dayKey()]||(a[dayKey()]={});t[k]=(t[k]||0)+n;set("activity",a)};
const streak=()=>{const a=get("activity",{});let s=0,i=a[dayKey()]?0:1;while(a[dayKey(i)]){s++;i++}return s};
const speak=t=>{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(t);u.lang=LANGS[LANG][1];speechSynthesis.cancel();speechSynthesis.speak(u)};
const vocabs=()=>get("savedVocabs",[]),saveV=v=>set("savedVocabs",v);
const mine=()=>vocabs().filter(v=>v.lang===LANG);
const words=t=>t.trim().split(/\s+/).filter(Boolean).length;

// one-time migration of old data (adds language + id + date)
(()=>{const v=vocabs();let c=0;v.forEach(x=>{if(!x.lang){x.lang=LANG;c=1}});if(c)saveV(v);
for(const k of["creativePieces","journalEntries"]){const a=get(k,[]);c=0;a.forEach((x,i)=>{if(!x.id){x.id=Date.now()+i;c=1}if(!x.lang){x.lang=LANG;c=1}if(!x.date){x.date=dayKey();c=1}});if(c)set(k,a)}})();

function layout(){const page=document.body.dataset.page;
$("#side").innerHTML=`<div class="brand">Language Journal</div><nav class="nav-links">${PAGES.map(([h,n])=>`<a href="${h}.html"${h===page?' class="active"':""}>${n}</a>`).join("")}</nav><label class="lang-pick">I'm learning<select id="lang">${Object.entries(LANGS).map(([k,[n]])=>`<option value="${k}"${k===LANG?" selected":""}>${esc(n)}</option>`).join("")}<option value="+">+ Add language…</option></select></label><div class="side-streak">🔥 ${streak()} day streak</div>`;
if(location.protocol==="file:"&&/Firefox/.test(navigator.userAgent))$("#side").insertAdjacentHTML("beforeend",`<p class="muted">Firefox keeps data separate for each file. Open the app through a local server (e.g. VS Code Live Server) so all pages share it.</p>`);
$("#lang").onchange=e=>{let v=e.target.value;if(v==="+"){const n=prompt("Language name?");if(!n){e.target.value=LANG;return}const c=prompt("Speech code for read-aloud, e.g. fi-FI (optional)")||"en-US",cl=get("customLangs",{});v=n.toLowerCase().replace(/[^a-z]/g,"")||"x"+Date.now();cl[v]=[n,c];set("customLangs",cl)}localStorage.setItem("lang",v);location.reload()}}

/* ---------- Dashboard ---------- */
function initDash(){const a=get("activity",{})[dayKey()]||{},v=mine(),d=Math.floor(Date.now()/864e5);
const goals=[["Review 10 words",a.reviews||0,10],["Write 50 words",a.words||0,50]];
$("#goals").innerHTML=goals.map(([t,n,m])=>`<div class="goal"><span>${n>=m?"✅":"⬜"} ${t}</span><div class="bar"><i style="width:${Math.min(100,n/m*100)}%"></i></div><small>${Math.min(n,m)}/${m}</small></div>`).join("");
$("#stats").innerHTML=[[v.length,`${LN()} words`],[v.filter(x=>x.level>=5).length,"mastered"],[streak(),"day streak"]].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
const w=v.length?v[d%v.length]:null;
$("#wotd").innerHTML=w?`<span class="vocab-front">${esc(w.front)}</span> – ${esc(w.back)} <button class="mini" id="say">🔊</button>${w.ex?`<br><small class="muted">${esc(w.ex)}</small>`:""}`:`No ${LN()} words yet. <a href="vocabulary.html" style="color:#07f9d7">Add your first</a>.`;
if(w)$("#say").onclick=()=>speak(w.front);
const n=[`Narrate what you're doing right now in ${LN()}, silently.`,`Name five objects around you in ${LN()}.`,`Say how you feel today in ${LN()}, in one sentence.`,`Plan tomorrow in ${LN()} in your head.`,`Describe the last meal you ate in ${LN()}.`,`Think of a question you'd ask a stranger in ${LN()}.`,`Complain about something small in ${LN()}. Be dramatic.`];
$("#nudge").textContent=n[d%7]}

/* ---------- Vocabulary ---------- */
function initVocab(){let mode="cards",dir="mixed",weak=!1,cur=null,editId=null,last=null,busy=!1,tm;
$("#lang-name").textContent=LN();$("#translation").placeholder=`Word or phrase in ${LN()}`;
const norm=(s,a)=>{s=s.toLowerCase().trim().replace(/[.!?,;:¡¿"']/g,"").replace(/\s+/g," ");return a?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s};
const ok=(i,ans)=>{const alts=ans.split(/[\/;,]/).map(x=>x.trim()).filter(Boolean).concat(ans);return alts.some(a=>norm(a)===norm(i))?2:alts.some(a=>norm(a,1)===norm(i,1))?1:0};
function pick(){let p=mine();if(weak){const w=p.filter(v=>(v.level||1)<4);if(w.length)p=w}if(p.length>1&&last)p=p.filter(v=>v.id!==last);if(!p.length)return null;
const w=p.map(v=>(6-(v.level||1))**2);let r=Math.random()*w.reduce((a,b)=>a+b),i=0;while((r-=w[i])>0&&i<w.length-1)i++;return p[i]}
function next(){clearTimeout(tm);busy=!1;cur=pick();const box=$("#q-area"),fb=$("#quiz-feedback");fb.textContent="";
if(!cur){$("#quiz-word").textContent="Add a few words first ✨";$("#quiz-level").textContent="";box.innerHTML="";return}
last=cur.id;const rev=dir==="mixed"?Math.random()<.5:dir==="back",q=rev?cur.back:cur.front,a=rev?cur.front:cur.back;
$("#quiz-word").innerHTML=esc(q)+(rev?"":` <button class="mini" id="say">🔊</button>`);if(!rev)$("#say").onclick=()=>speak(cur.front);
$("#quiz-level").textContent=`Level ${cur.level||1}`;
if(mode==="cards"){box.innerHTML=`<button id="show" class="ghost">Show answer</button>`;$("#show").onclick=()=>{box.innerHTML=`<div class="answer">${esc(a)}${cur.ex?`<small>${esc(cur.ex)}</small>`:""}</div><div class="row"><button class="bad" id="no">Missed it</button><button id="yes">Got it</button></div>`;$("#no").onclick=()=>grade(0,a,1);$("#yes").onclick=()=>grade(2,a,1)}}
else if(mode==="type"){box.innerHTML=`<input id="quiz-answer" placeholder="Type the translation, then press Enter…" autocomplete="off"><div class="row"><button class="ghost" id="skip">Skip</button><button id="check-btn">Check answer</button></div>`;const i=$("#quiz-answer");i.focus();const go=()=>{if(i.value.trim())grade(ok(i.value,a),a)};$("#check-btn").onclick=go;$("#skip").onclick=next;i.onkeydown=e=>{if(e.key==="Enter")go()}}
else{const o=shuffle([a,...shuffle([...new Set(mine().filter(v=>v.id!==cur.id).map(v=>rev?v.front:v.back).filter(x=>x!==a))]).slice(0,3)]);
box.innerHTML=`<div class="opts">${o.map(x=>`<button class="opt">${esc(x)}</button>`).join("")}</div>`;$$(".opt",box).forEach(b=>b.onclick=()=>{$$(".opt",box).forEach(x=>x.disabled=!0);grade(b.textContent===a?2:0,a)})}}
function grade(r,a,instant){if(busy)return;busy=!0;const all=vocabs(),t=all.find(v=>v.id===cur.id);if(!t)return;
t.seen=(t.seen||0)+1;t.level=t.level||1;if(r){t.level=Math.min(5,t.level+1);t.right=(t.right||0)+1;bump("correct")}else t.level=Math.max(1,t.level-1);
bump("reviews");saveV(all);const fb=$("#quiz-feedback");fb.className=r?"ok":"no";
fb.textContent=r===1?`Right – mind the accents: ${a}`:r?`Correct! Level ${t.level}`:`Not quite – ${a}`;
$("#quiz-level").textContent=`Level ${t.level}`;renderList();tm=setTimeout(next,instant?250:r?1100:2200)}
function renderList(){const q=$("#search").value.toLowerCase(),v=mine().filter(x=>(x.front+x.back+(x.ex||"")).toLowerCase().includes(q));
$("#saved-list").innerHTML=v.map(x=>`<div class="vocab-card${x.level>=5?" mastered":""}" data-id="${x.id}"><div class="vocab-front">${esc(x.front)}</div><div class="vocab-back">${esc(x.back)}${x.ex?`<small>${esc(x.ex)}</small>`:""}</div><div class="vocab-footer"><span class="vocab-level">Level ${x.level||1} / 5</span><div class="card-buttons"><button data-a="say" title="Listen">🔊</button><button data-a="edit" title="Edit">✏️</button><button data-a="del" title="Delete">🗑️</button></div></div></div>`).join("")||`<p class="muted">Nothing here yet.</p>`;
const n=mine().length;$("#word-count").textContent=`${n} ${n===1?"vocab":"vocabs"}`}
$("#saved-list").onclick=e=>{const c=e.target.closest(".vocab-card");if(!c)return;const id=+c.dataset.id,a=e.target.dataset.a,x=vocabs().find(v=>v.id===id);if(!x)return;
if(a==="say")speak(x.front);else if(a==="del"){if(confirm("Delete this word?")){saveV(vocabs().filter(v=>v.id!==id));renderList();next()}}
else if(a==="edit"){$("#translation").value=x.front;$("#back").value=x.back;$("#example").value=x.ex||"";editId=id;$("#save-btn").textContent="Update Vocab";scrollTo({top:$("#add-box").offsetTop-20,behavior:"smooth"})}else c.classList.toggle("revealed")};
$("#save-btn").onclick=()=>{const f=$("#translation").value.trim(),b=$("#back").value.trim(),ex=$("#example").value.trim();if(!f||!b)return;const all=vocabs();
if(editId){const t=all.find(v=>v.id===editId);if(t)Object.assign(t,{front:f,back:b,ex});editId=null;$("#save-btn").textContent="Save Vocab"}
else{all.unshift({id:Date.now(),lang:LANG,front:f,back:b,ex,level:1,seen:0,right:0});bump("added")}
saveV(all);["#translation","#back","#example"].forEach(s=>$(s).value="");renderList();next()};
$("#bulk-btn").onclick=()=>{const all=vocabs();let n=0;$("#bulk").value.split("\n").forEach((l,i)=>{const p=l.split(/\s*[;\t]\s*/);if(p[0]&&p[1]){all.unshift({id:Date.now()+i,lang:LANG,front:p[0].trim(),back:p[1].trim(),ex:(p[2]||"").trim(),level:1,seen:0,right:0});n++}});
if(n){saveV(all);bump("added",n)}$("#bulk").value="";renderList();next()};
$("#export").onclick=()=>{const csv=mine().map(v=>[v.front,v.back,v.ex||""].join(";")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`vocab-${LANG}.csv`;a.click()};
$$(".tab").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$(".tab").forEach(x=>x.classList.toggle("active",x===b));next()});
$("#dir").onchange=e=>{dir=e.target.value;next()};$("#weak").onchange=e=>{weak=e.target.checked;next()};$("#search").oninput=renderList;
renderList();next()}

/* ---------- Journal + Creative Studio ---------- */
const SP=["Write a short dialogue between two strangers on a midnight train.","Describe your favorite place using only sounds and smells.","Write a letter to your future self five years from now.","Invent a word in your target language and explain what it means.","Tell a story that starts with: 'I wasn't supposed to open that door.'","Retell a fairy tale, but the villain is the narrator.","Write a review of a restaurant that doesn't exist.","Describe a character only through what is in their pockets."];
const JP=["What did you do today? Three sentences are enough.","Describe how you feel right now, as precisely as you can.","Write about something you saw on the way today.","What are you looking forward to this week?","Describe a person you met recently.","Write what you would say to a friend who is feeling down.","Describe your morning routine step by step."];
function initWriter(key,prompts,titled){let editId=null;const ed=$("#story-editor"),tt=$("#story-title");
const stats=()=>{const n=words(ed.value),c=get(key,[]).filter(x=>x.lang===LANG).length;$("#word-count").textContent=`${n} ${n===1?"word":"words"} | ${c} saved`};
$("#new-prompt-btn").onclick=()=>{$("#prompt-text").textContent="Prompt: "+prompts[Math.floor(Math.random()*prompts.length)]};
const chips=()=>{const v=mine().sort((a,b)=>(a.level||1)-(b.level||1)).slice(0,24),s=shuffle(v).slice(0,8);$("#chips").innerHTML=s.length?`Use your words: ${s.map(x=>`<span class="chip">${esc(x.front)}</span>`).join("")} <button class="mini" id="shuf">↻</button>`:`<span>Words you save in Vocabulary show up here as writing helpers.</span>`;
$$(".chip").forEach(c=>c.onclick=()=>{ed.setRangeText(c.textContent+" ",ed.selectionStart,ed.selectionEnd,"end");ed.focus();stats()});if(s.length)$("#shuf").onclick=chips};
$("#sel-vocab").onclick=()=>{const s=ed.value.substring(ed.selectionStart,ed.selectionEnd).trim();if(!s)return alert("Select a word or phrase in your text first.");const b=prompt(`Meaning of "${s}"?`);if(!b)return;
const all=vocabs();all.unshift({id:Date.now(),lang:LANG,front:s,back:b.trim(),ex:"",level:1,seen:0,right:0});saveV(all);bump("added");chips()};
function render(){const l=get(key,[]).filter(x=>x.lang===LANG);
$("#saved-list").className="stack";
$("#saved-list").innerHTML=l.map(x=>`<div class="saved-card" data-id="${x.id}">${titled?`<h4>${esc(x.title||"Untitled")}</h4>`:""}<div class="meta">${x.date} · ${words(x.content)} words${x.edited?` · revised ${x.edited}`:""}</div><p>${esc(x.content)}</p><div class="card-buttons"><button data-a="say">🔊</button><button data-a="ai">🤖 Feedback</button><button data-a="edit">✏️ Revise</button><button data-a="del">🗑️</button></div>${(x.history||[]).length?`<details><summary>Earlier versions (${x.history.length})</summary>${x.history.map(h=>`<p><small>${h.date}</small><br>${esc(h.content)}</p>`).join("")}</details>`:""}</div>`).join("")||`<p class="muted">Nothing saved in ${LN()} yet. Your first piece is waiting.</p>`;stats()}
$("#saved-list").onclick=e=>{const c=e.target.closest(".saved-card"),a=e.target.dataset.a;if(!c||!a)return;const id=+c.dataset.id,all=get(key,[]),x=all.find(i=>i.id===id);if(!x)return;
if(a==="ai"){sessionStorage.setItem("aiText",x.content);location.href="tutor.html"}else if(a==="say")speak(x.content);else if(a==="del"){if(confirm("Delete this piece? Earlier versions go with it.")){set(key,all.filter(i=>i.id!==id));render()}}
else{ed.value=x.content;if(titled)tt.value=x.title||"";editId=id;$("#save-btn").textContent="Save revision";scrollTo({top:0,behavior:"smooth"});stats()}};
$("#save-btn").onclick=()=>{const c=ed.value.trim();if(!c)return;const all=get(key,[]),t=titled?tt.value.trim():"";
if(editId){const x=all.find(i=>i.id===editId);if(x){(x.history=x.history||[]).unshift({content:x.content,date:x.edited||x.date});bump("words",Math.max(0,words(c)-words(x.content)));Object.assign(x,{title:t,content:c,edited:dayKey()})}editId=null;$("#save-btn").textContent="Save"}
else{all.unshift({id:Date.now(),lang:LANG,title:t,content:c,date:dayKey(),history:[]});bump("words",words(c))}
set(key,all);ed.value="";if(titled)tt.value="";render()};
ed.oninput=stats;chips();render()}

/* ---------- Progress ---------- */
function initProgress(){const act=get("activity",{}),all=vocabs(),m=mine(),sum=k=>Object.values(act).reduce((s,d)=>s+(d[k]||0),0),rv=sum("reviews"),pcs=get("journalEntries",[]).length+get("creativePieces",[]).length;
$("#stats").innerHTML=[[all.length,"words total"],[all.filter(x=>x.level>=5).length,"mastered"],[rv?Math.round(sum("correct")/rv*100)+"%":"–","accuracy"],[sum("words"),"words written"],[pcs,"texts saved"],[streak(),"day streak"]].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
$("#lvl-title").textContent=`${LN()} by level`;
$("#levels").innerHTML=[1,2,3,4,5].map(l=>{const n=m.filter(x=>(x.level||1)===l).length;return`<div class="lvl"><span>Level ${l}</span><div class="bar"><i style="width:${m.length?n/m.length*100:0}%"></i></div><span>${n}</span></div>`}).join("");
const days=[...Array(14)].map((_,i)=>dayKey(13-i)),mr=Math.max(1,...days.map(d=>(act[d]||{}).reviews||0)),mw=Math.max(1,...days.map(d=>(act[d]||{}).words||0));
$("#chart").innerHTML=days.map(d=>{const a=act[d]||{};return`<div class="col" title="${d}: ${a.reviews||0} reviews, ${a.words||0} words"><i style="height:${(a.reviews||0)/mr*100}%"></i><i class="w" style="height:${(a.words||0)/mw*100}%"></i><small>${d.slice(8)}</small></div>`}).join("");
const per={};all.forEach(x=>per[x.lang]=(per[x.lang]||0)+1);
$("#per-lang").innerHTML=Object.entries(per).map(([k,n])=>`<div class="lvl"><span>${esc((LANGS[k]||[k])[0])}</span><div class="bar"><i style="width:${n/all.length*100}%"></i></div><span>${n}</span></div>`).join("")||`<p class="muted">No words yet.</p>`}

layout();({index:initDash,journal:()=>initWriter("journalEntries",JP,0),"creative-studio":()=>initWriter("creativePieces",SP,1),vocabulary:initVocab,progress:initProgress})[document.body.dataset.page]?.();
addEventListener("pageshow",e=>{if(e.persisted)location.reload()});
