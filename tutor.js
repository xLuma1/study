/* AI Tutor – calls the Anthropic API straight from the browser with the user's own key */
const lv=()=>localStorage.getItem("aiLevel")||"A2";
const nz=s=>String(s).toLowerCase().trim().replace(/[.!?,;:¡¿"']/g,"").replace(/\s+/g," ");
let W=[],EX=[],ST="",seq=0;
async function ai(task,max=2500){const k=localStorage.getItem("aiKey");if(!k)throw new Error("Add your API key under Settings first.");
const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
body:JSON.stringify({model:localStorage.getItem("aiModel")||"claude-sonnet-5-5",max_tokens:max,system:`You are a warm, precise ${LN()} tutor. The learner's level is ${lv()} (CEFR). Write all explanations in English and use ${LN()} only for examples and texts. Reply with ONLY valid JSON, no markdown fences.`,messages:[{role:"user",content:task}]})});
const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Request failed ("+r.status+")");
const t=d.content.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();try{return JSON.parse(t)}catch(e){throw new Error("The AI answer was cut off or malformed. Try again, or pick a shorter length.")}}
const addW=w=>{const a=vocabs();if(!w||!w.front||!w.back||a.some(x=>x.lang===LANG&&nz(x.front)===nz(w.front)))return;a.unshift({id:Date.now()+seq++,lang:LANG,front:w.front,back:w.back,ex:w.ex||"",level:1,seen:0,right:0});saveV(a);bump("added")};
const wordsHtml=l=>(W=l||[]).map((w,i)=>`<div class="mk"><b>${esc(w.front)}</b> – ${esc(w.back)}${w.ex?`<br><small class="muted">${esc(w.ex)}</small>`:""} <button class="mini addw" data-i="${i}">＋ Add</button></div>`).join("")+(W.length?`<button id="addall" style="margin-top:8px">Add all to my vocab</button>`:"");
function bind(o){$$(".addw",o).forEach(b=>b.onclick=()=>{addW(W[b.dataset.i]);b.textContent="✓ Added";b.disabled=true});
const all=$("#addall",o);if(all)all.onclick=()=>{W.forEach(addW);$$(".addw",o).forEach(b=>{b.textContent="✓ Added";b.disabled=true});all.disabled=true};
const ck=$("#chkall",o);if(ck)ck.onclick=()=>{let n=0;$$(".ex",o).forEach(i=>{const e=EX[i.dataset.i],ok=e.answer.split("/").some(a=>nz(a)===nz(i.value));n+=ok;i.disabled=true;i.insertAdjacentHTML("afterend",ok?` ✅`:` ❌ <b>${esc(e.answer)}</b>`)});ck.outerHTML=`<p><b>${n} / ${EX.length}</b> correct</p>`;bump("grammar")};
const sy=$("#sayst",o);if(sy)sy.onclick=()=>speak(ST)}
function run(id,fn){const b=$("#"+id+"-go"),o=$("#"+id+"-out");b.onclick=async()=>{b.disabled=true;o.innerHTML=`<p class="muted">Thinking…</p>`;try{o.innerHTML=await fn()}catch(e){o.innerHTML=`<p style="color:#ff6b6b">${esc(e.message)}</p>`}b.disabled=false;bind(o)}}

run("fb",async()=>{const t=$("#fb-in").value.trim();if(!t)throw Error("Write or paste a text first.");
const r=await ai(`Review this ${LN()} text by the learner. Keep their voice and ideas, only fix real errors. JSON: {"score":0-100,"summary":"2 sentences","corrected":"full corrected text","mistakes":[{"orig":"","fix":"","why":""}],"praise":"what went well","tips":["short tip"],"words":[{"front":"useful ${LN()} word or phrase","back":"English meaning","ex":"short example"}]} with up to 5 words.\n\nText:\n${t}`);
bump("feedback");return`<div class="stat"><b>${esc(r.score)}</b><span>${esc(r.summary)}</span></div><h3>Corrected</h3><p style="white-space:pre-wrap">${esc(r.corrected)}</p><h3>Mistakes</h3>${(r.mistakes||[]).map(m=>`<div class="mk"><s>${esc(m.orig)}</s> → <b>${esc(m.fix)}</b><br><small class="muted">${esc(m.why)}</small></div>`).join("")||`<p class="muted">No mistakes found 🎉</p>`}<p>👍 ${esc(r.praise)}</p><ul>${(r.tips||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h3>Words worth learning</h3>${wordsHtml(r.words)}`});

run("gr",async()=>{const tp=$("#gr-topic").value.trim();
const r=await ai(`Teach one ${LN()} grammar point at level ${lv()}${tp?`: ${tp}`:" (choose a useful one)"}. JSON: {"title":"","rule":"clear explanation in 4-6 sentences","examples":[{"t":"${LN()} sentence","en":"English"}],"exercises":[{"q":"${LN()} sentence with ___ for the gap","answer":"correct word(s); use / for accepted alternatives","hint":"English hint"}]} with 3 examples and 6 exercises.`);
EX=r.exercises||[];return`<h3>${esc(r.title)}</h3><p>${esc(r.rule)}</p>${(r.examples||[]).map(e=>`<div class="mk">${esc(e.t)}<br><small class="muted">${esc(e.en)}</small></div>`).join("")}<h3>Practice</h3>${EX.map((e,i)=>`<div class="mk">${i+1}. ${esc(e.q)}<br><input class="ex" data-i="${i}" placeholder="${esc(e.hint)}" style="margin-top:6px"></div>`).join("")}<button id="chkall">Check answers</button>`});

run("st",async()=>{const tp=$("#st-topic").value.trim(),ws=shuffle(mine()).slice(0,8).map(v=>v.front).join(", ");
const r=await ai(`Write a short story of about ${$("#st-len").value} words in ${LN()} at level ${lv()}${tp?`, about: ${tp}`:""}. ${ws?`Work in some of the learner's own words: ${ws}.`:""} JSON: {"title":"","text":"","english":"English translation","glossary":[{"front":"${LN()} word","back":"English","ex":"example"}],"questions":[{"q":"comprehension question in ${LN()}","a":"answer"}]} with 6 glossary words of new vocabulary and 3 questions.`,4000);
ST=r.text;bump("stories");return`<h3>${esc(r.title)} <button class="mini" id="sayst">🔊</button></h3><p style="white-space:pre-wrap;line-height:1.8">${esc(r.text)}</p><details><summary class="muted">English translation</summary><p>${esc(r.english)}</p></details><h3>New words</h3>${wordsHtml(r.glossary)}<h3>Questions</h3>${(r.questions||[]).map(q=>`<details class="mk"><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join("")}`});

run("nw",async()=>{const th=$("#nw-theme").value.trim()||"everyday life",have=mine().slice(0,60).map(v=>v.front).join(", ");
const r=await ai(`Give ${$("#nw-n").value} useful ${LN()} words or short phrases about "${th}" for level ${lv()}. Avoid these known words: ${have||"none"}. JSON: {"words":[{"front":"${LN()}, with article/gender if relevant","back":"English","ex":"short example sentence in ${LN()}"}]}`);
return wordsHtml(r.words)});

// tabs
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.toggle("active",x===b));$$(".pane").forEach(p=>p.hidden=p.id!=="pane-"+b.dataset.pane)});
// settings
$("#ai-key").value=localStorage.getItem("aiKey")||"";$("#ai-model").value=localStorage.getItem("aiModel")||"claude-sonnet-5-5";$("#ai-level").value=lv();
$("#ai-save").onclick=()=>{localStorage.setItem("aiKey",$("#ai-key").value.trim());localStorage.setItem("aiModel",$("#ai-model").value.trim()||"claude-sonnet-5-5");localStorage.setItem("aiLevel",$("#ai-level").value);$("#ai-saved").textContent="Saved ✓"};
$("#ai-clear").onclick=()=>{localStorage.removeItem("aiKey");$("#ai-key").value="";$("#ai-saved").textContent="Key removed"};
$("#settings").open=!localStorage.getItem("aiKey");
$$(".lang-label").forEach(e=>e.textContent=LN());
const pre=sessionStorage.getItem("aiText");if(pre){$("#fb-in").value=pre;sessionStorage.removeItem("aiText")}
