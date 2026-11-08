const $=s=>document.querySelector(s);
const h=(t,a={},...c)=>{const e=document.createElement(t);for(const k in a){if(k==='class')e.className=a[k];else if(k.startsWith('on'))e.addEventListener(k.slice(2),a[k]);else if(a[k]!==false&&a[k]!=null)e.setAttribute(k,a[k])}c.flat().forEach(x=>{if(x!=null)e.append(x.nodeType?x:document.createTextNode(String(x)))});return e};
let cid=localStorage.getItem('qbtc_cid');if(!/^[a-f0-9]{32}$/.test(cid||'')){cid=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('qbtc_cid',cid)}
const S={posts:[],view:'ideas',q:'',tag:'',sort:'top',admin:sessionStorage.getItem('qbtc_adm')||''};
const ST={review:'Under review',planned:'Planned',progress:'In progress',shipped:'Shipped'},CATS=['Feature','Tokenomics','Partnership','Governance','Community','Tech','Marketing'];
function toast(m,err){const t=$('#toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',2600)}
async function api(url,o={}){const hd={'x-cid':cid};if(S.admin)hd['x-admin-token']=S.admin;let body=o.body;
  if(body&&!(body instanceof FormData)){hd['content-type']='application/json';body=JSON.stringify(body)}
  const r=await fetch(url,{method:o.method||'GET',headers:hd,body});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed');return j}
const ago=t=>{const m=(Date.now()-t)/6e4;return m<60?Math.max(1,m|0)+'m ago':m<1440?(m/60|0)+'h ago':(m/1440|0)+'d ago'};
async function load(){try{S.posts=await api('/api/posts');render()}catch(e){toast(e.message,1)}}
function list(){const q=S.q.toLowerCase().replace(/^#/,'');let r=S.posts.filter(p=>(!S.tag||p.tags.includes(S.tag))&&(!q||(p.title+p.summary+p.tags.join(' ')+p.category).toLowerCase().includes(q)));
  const f={top:(a,b)=>b.votes-a.votes,new:(a,b)=>b.created-a.created,talk:(a,b)=>b.commentCount-a.commentCount};return r.sort(f[S.sort])}
function render(){
  $('#hero').hidden=!!S.id;if(S.id)return;
  const P=S.posts;$('#stats').replaceChildren(...[[P.length,'ideas shared'],[P.reduce((a,p)=>a+p.votes,0),'votes cast'],[P.reduce((a,p)=>a+p.commentCount,0),'comments'],[P.filter(p=>p.status==='shipped').length,'shipped']].map(([n,l])=>h('div',{},h('b',{},n),h('span',{},l))));
  const tags=[...new Set(P.flatMap(p=>p.tags))].sort();$('#tags').replaceChildren(...['',...tags].map(t=>h('button',{class:'chip'+(S.tag===t?' on':''),onclick:()=>{S.tag=t;render()}},t?'#'+t:'All')));
  $('#tools').hidden=S.view==='roadmap';const out=$('#out');
  if(S.view==='roadmap'){out.replaceChildren(h('div',{class:'board'},...Object.keys(ST).map(k=>{const items=P.filter(p=>p.status===k).sort((a,b)=>b.votes-a.votes);
    return h('div',{class:'col'},h('h2',{},ST[k],h('span',{class:'tag'},items.length)),...items.map(p=>h('div',{class:'card',tabindex:0,onclick:()=>openPost(p.id),onkeydown:e=>e.key==='Enter'&&openPost(p.id)},h('h4',{},p.title),h('div',{class:'meta'},'▲ '+p.votes,' ',p.category))))})));return}
  const L=list();out.replaceChildren(...(L.length?L.map(card):[h('div',{class:'empty'},'No ideas match yet. Be the first to post one.')]))}
function card(p){return h('article',{class:'post'},
  h('button',{class:'vote'+(p.voted?' on':''),'aria-label':'Vote',onclick:()=>vote(p.id)},'▲',h('b',{},p.votes)),
  h('div',{},h('h3',{},h('a',{href:'/idea/'+p.id,onclick:nav},p.title)),h('p',{},p.summary),
  h('div',{class:'meta'},h('span',{class:'st '+p.status},ST[p.status]),p.category,...p.tags.map(t=>h('span',{class:'tag'},'#'+t)),'by '+p.author,ago(p.created),h('button',{class:'chip',onclick:()=>openPost(p.id)},'💬 Discuss ('+p.commentCount+')'))))}
async function vote(id){try{const u=await api(`/api/posts/${id}/vote`,{method:'POST'});S.posts=S.posts.map(p=>p.id===id?u:p);render()}catch(e){toast(e.message,1)}}
function modal(...n){$('#mbody').replaceChildren(...n);$('#modal').hidden=false;document.body.style.overflow='hidden'}
function closeM(){$('#modal').hidden=true;document.body.style.overflow=''}
function nav(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;e.preventDefault();go(e.currentTarget.getAttribute('href'))}
function go(p){if(location.pathname!==p)history.pushState({},'',p);route()}
function openPost(id){go('/idea/'+id)}
function route(){clearInterval(S.poll);const m=location.pathname.match(/^\/idea\/([a-f0-9]{12})$/);S.id=m?m[1]:null;scrollTo(0,0);
  if(S.id){$('#hero').hidden=$('#tools').hidden=true;$('#out').replaceChildren(h('div',{class:'empty'},'Loading...'));loadPage()}else{document.title='QBTC Hub: ideas and roadmap';load()}}
async function loadPage(){try{showPage(await api('/api/posts/'+S.id))}catch(e){$('#out').replaceChildren(h('div',{class:'empty'},e.message+'. ',h('a',{href:'/',onclick:nav},'Back to all ideas')))}}
function showPage(p){
  clearInterval(S.poll);document.title=p.title+' | QBTC Hub';let to=null;
  const au=h('input',{maxlength:30,placeholder:'Your name (optional)',value:localStorage.getItem('qbtc_name')||''}),tx=h('textarea',{rows:4,maxlength:1000,placeholder:'Write your reply. Ctrl+Enter to post'}),hint=h('div',{class:'meta'}),thread=h('div',{class:'thread'}),cnt=h('h3',{});
  const setTo=c=>{to=c;hint.replaceChildren(...(c?['Replying to '+c.author,h('button',{class:'chip',onclick:()=>setTo(null)},'Cancel')]:[]))};
  const act=fn=>async()=>{try{draw(await fn())}catch(e){toast(e.message,1)}};
  function draw(d){p=d;cnt.textContent=d.comments.length+(d.comments.length===1?' reply':' replies');
    const item=(c,r)=>h('div',{class:'cm'+(r?' rep':'')},h('div',{class:'chd'},h('span',{class:'av'},(c.author[0]||'?').toUpperCase()),h('b',{},c.author),c.author===p.author&&c.author!=='anon'?h('span',{class:'op'},'author'):null,h('small',{},ago(c.created))),h('p',{},c.text),
      h('div',{class:'cact'},h('button',{class:'lk'+(c.liked?' on':''),onclick:act(()=>api(`/api/posts/${p.id}/comments/${c.id}/like`,{method:'POST'}))},'▲ '+c.likes),
      h('button',{class:'lk',onclick:()=>{setTo({id:c.parent||c.id,author:c.author});tx.focus()}},'Reply'),
      S.admin?h('button',{class:'lk',onclick:act(()=>api(`/api/posts/${p.id}/comments/${c.id}`,{method:'DELETE'}))},'Delete'):null));
    const top=d.comments.filter(c=>!c.parent);
    thread.replaceChildren(...(top.length?top.flatMap(c=>[item(c),...d.comments.filter(x=>x.parent===c.id).map(x=>item(x,1))]):[h('div',{class:'empty'},'No replies yet. Be the first to respond below.')]))}
  const send=async()=>{const b=$('#send');b.disabled=true;try{localStorage.setItem('qbtc_name',au.value);const u=await api(`/api/posts/${p.id}/comments`,{method:'POST',body:{author:au.value,text:tx.value,parent:to&&to.id}});tx.value='';setTo(null);draw(u);toast('Reply posted')}catch(x){toast(x.message,1)}b.disabled=false};
  tx.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))send()};
  const vb=h('button',{class:'vote big'+(p.voted?' on':''),'aria-label':'Vote',onclick:async()=>{try{const u=await api(`/api/posts/${p.id}/vote`,{method:'POST'});vb.classList.toggle('on',u.voted);vb.replaceChildren('▲',h('b',{},u.votes))}catch(e){toast(e.message,1)}}},'▲',h('b',{},p.votes));
  const adm=S.admin?h('div',{class:'adminbar'},h('select',{onchange:async e=>{try{await api(`/api/posts/${p.id}/status`,{method:'PATCH',body:{status:e.target.value}});toast('Status updated')}catch(x){toast(x.message,1)}}},...Object.keys(ST).map(k=>h('option',{value:k,selected:k===p.status},ST[k]))),
    h('button',{class:'danger',onclick:async()=>{if(!confirm('Delete this idea?'))return;try{await api('/api/posts/'+p.id,{method:'DELETE'});toast('Deleted');go('/')}catch(x){toast(x.message,1)}}},'Delete idea')):null;
  $('#out').replaceChildren(h('div',{class:'qpage'},h('a',{href:'/',class:'back',onclick:nav},'← All ideas'),
    h('div',{class:'q'},vb,h('div',{class:'qmain'},h('div',{class:'meta'},h('span',{class:'st '+p.status},ST[p.status]),p.category,'posted by '+p.author,ago(p.created)),h('h1',{class:'qt'},p.title),
      h('div',{class:'meta'},...p.tags.map(t=>h('span',{class:'tag'},'#'+t))),adm,h('div',{class:'body'},p.summary),
      p.images.length?h('div',{class:'gal'},...p.images.map(i=>h('a',{href:'/uploads/'+i,target:'_blank',rel:'noopener'},h('img',{src:'/uploads/'+i,alt:'Idea attachment',loading:'lazy'})))):null)),
    h('div',{class:'dhead'},cnt,h('span',{class:'live'},'Updates automatically')),thread,
    h('div',{class:'composer rbox'},h('h3',{},'Your reply'),hint,au,tx,h('button',{id:'send',class:'primary',onclick:send},'Post reply'))));
  draw(p);
  S.poll=setInterval(async()=>{if(document.hidden||!S.id)return;try{const d=await api('/api/posts/'+p.id),k=x=>x.comments.map(c=>c.id+c.likes).join();if(k(d)!==k(p))draw(d)}catch{}},5000)}
function newIdea(){
  const f={t:h('input',{maxlength:120,placeholder:'Short, clear title'}),s:h('textarea',{rows:6,maxlength:4000,placeholder:'Explain the idea: the problem, your solution, and who benefits'}),
    c:h('select',{},...CATS.map(c=>h('option',{},c))),g:h('input',{placeholder:'wallet, staking, ux (max 5, comma separated)'}),a:h('input',{maxlength:30,placeholder:'Your name',value:localStorage.getItem('qbtc_name')||''}),
    i:h('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',multiple:true})};const pv=h('div',{class:'prev'});
  f.i.onchange=()=>{pv.replaceChildren();[...f.i.files].slice(0,3).forEach(x=>pv.append(h('img',{src:URL.createObjectURL(x),alt:'preview'})))};
  modal(h('h2',{},'Post an idea'),h('label',{},'Title'),f.t,h('label',{},'Summary'),f.s,h('div',{class:'row'},h('div',{},h('label',{},'Category'),f.c),h('div',{},h('label',{},'Your name'),f.a)),
    h('label',{},'Tags'),f.g,h('label',{},'Images (up to 3, max 2 MB each)'),f.i,pv,h('div',{style:'height:16px'}),
    h('button',{class:'primary',onclick:async e=>{const fd=new FormData();fd.append('title',f.t.value);fd.append('summary',f.s.value);fd.append('category',f.c.value);fd.append('tags',f.g.value);fd.append('author',f.a.value);
      [...f.i.files].slice(0,3).forEach(x=>fd.append('images',x));e.target.disabled=true;
      try{localStorage.setItem('qbtc_name',f.a.value);await api('/api/posts',{method:'POST',body:fd});closeM();toast('Idea posted');S.view='ideas';syncNav();go('/')}catch(x){toast(x.message,1);e.target.disabled=false}}},'Publish idea'))}
function syncNav(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.view))}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{S.view=b.dataset.v;syncNav();S.id||location.pathname!=='/'?go('/'):render()});
$('#q').oninput=e=>{S.q=e.target.value;render()};$('#sort').onchange=e=>{S.sort=e.target.value;render()};
$('#new').onclick=newIdea;$('#close').onclick=closeM;$('#modal').onclick=e=>{if(e.target.id==='modal')closeM()};document.onkeydown=e=>{if(e.key==='Escape')closeM()};
const adm=$('#adm');adm.classList.toggle('on',!!S.admin);
adm.onclick=async()=>{if(S.admin){S.admin='';sessionStorage.removeItem('qbtc_adm');adm.classList.remove('on');return toast('Admin mode off')}
  const t=prompt('Admin token');if(!t)return;S.admin=t;try{await api('/api/admin/check');sessionStorage.setItem('qbtc_adm',t);adm.classList.add('on');toast('Admin mode on')}catch{S.admin='';toast('Invalid token',1)}};
window.onpopstate=route;route();
