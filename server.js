const express=require('express'),helmet=require('helmet'),rl=require('express-rate-limit'),multer=require('multer'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DATA=process.env.DATA_DIR||path.join(__dirname,'data'),UP=path.join(DATA,'uploads'),DBF=path.join(DATA,'db.json'),ADMIN=process.env.ADMIN_TOKEN||'';
fs.mkdirSync(UP,{recursive:true});
const STATUS=['review','planned','progress','shipped'],rid=()=>crypto.randomBytes(6).toString('hex');
let db,t;
try{db=JSON.parse(fs.readFileSync(DBF,'utf8').replace(/^\uFEFF/,''))}catch(e){
  if(e.code!=='ENOENT'){try{fs.copyFileSync(DBF,DBF+'.corrupt-'+Date.now())}catch{}}
  db={posts:[]};save()}
if(!db||!Array.isArray(db.posts)){db={posts:[]};save()}
function save(){clearTimeout(t);t=setTimeout(()=>{const tmp=DBF+'.tmp';fs.writeFile(tmp,JSON.stringify(db,null,1),e=>!e&&fs.rename(tmp,DBF,()=>{}))},100)}
const clean=(s,n,nl)=>String(s??'').replace(nl?/[\u0000-\u0009\u000b-\u001f\u007f]/g:/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const sig=b=>b.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':b.subarray(0,4).equals(Buffer.from([137,80,78,71]))?'png':(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')?'webp':b.subarray(0,3).toString()==='GIF'?'gif':null;
const cidOf=r=>{const c=String(r.get('x-cid')||'');return /^[a-f0-9]{16,48}$/.test(c)?c:null};
const isAdmin=r=>{const h=String(r.get('x-admin-token')||'');return !!ADMIN&&h.length===ADMIN.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(ADMIN))};
const needAdmin=(q,s,n)=>isAdmin(q)?n():s.status(403).json({error:'Admin token required'});
const view=(p,cid,full)=>({id:p.id,title:p.title,summary:p.summary,tags:p.tags,category:p.category,author:p.author,status:p.status,created:p.created,images:p.images,votes:p.voters.length,voted:!!cid&&p.voters.includes(cid),commentCount:p.comments.length,...(full?{comments:p.comments.map(c=>({id:c.id,author:c.author,text:c.text,created:c.created,parent:c.parent||null,likes:(c.likes||[]).length,liked:!!cid&&(c.likes||[]).includes(cid)}))}:{})});
const find=(q,s)=>{const p=db.posts.find(x=>x.id===q.params.id);if(!p)s.status(404).json({error:'Not found'});return p};

const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],objectSrc:["'none'"],frameAncestors:["'none'"],baseUri:["'self'"],formAction:["'self'"]}},crossOriginResourcePolicy:{policy:'same-origin'}}));
app.use(rl({windowMs:15*60e3,limit:400,standardHeaders:true,legacyHeaders:false}));
const writeLimit=rl({windowMs:10*60e3,limit:60,message:{error:'Too many actions, try again in a few minutes'}});
app.use(express.json({limit:'20kb'}));
app.get('/healthz',(q,s)=>s.send('ok'));
app.use('/uploads',express.static(UP,{dotfiles:'deny',index:false,maxAge:'7d'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/idea/:id',(q,s)=>s.sendFile(path.join(__dirname,'public','index.html')));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:3,fields:10}});

app.get('/api/posts',(q,s)=>{const c=cidOf(q);s.json(db.posts.map(p=>view(p,c)))});
app.get('/api/posts/:id',(q,s)=>{const p=find(q,s);p&&s.json(view(p,cidOf(q),true))});
app.post('/api/posts',writeLimit,upload.array('images',3),(q,s)=>{
  const title=clean(q.body.title,120),summary=clean(q.body.summary,4000,1);
  if(title.length<5||summary.length<20)return s.status(400).json({error:'Title (5+ chars) and summary (20+ chars) required'});
  const tags=[...new Set(clean(q.body.tags,200).toLowerCase().split(',').map(x=>x.trim().replace(/[^a-z0-9-]/g,'')).filter(Boolean))].slice(0,5);
  const images=[];
  for(const f of q.files||[]){const e=sig(f.buffer);if(!e)return s.status(400).json({error:'Only PNG, JPG, WEBP or GIF images allowed'});const n=rid()+rid()+'.'+e;fs.writeFileSync(path.join(UP,n),f.buffer);images.push(n)}
  const cats=['Feature','Tokenomics','Partnership','Governance','Community','Tech','Marketing'];
  const p={id:rid(),title,summary,tags,category:cats.includes(q.body.category)?q.body.category:'Feature',author:clean(q.body.author,30)||'anon',status:'review',created:Date.now(),images,voters:[],comments:[]};
  db.posts.unshift(p);save();s.status(201).json(view(p,cidOf(q)));
});
app.post('/api/posts/:id/vote',writeLimit,(q,s)=>{const p=find(q,s);if(!p)return;const c=cidOf(q);if(!c)return s.status(400).json({error:'Bad client id'});
  const i=p.voters.indexOf(c);i<0?p.voters.push(c):p.voters.splice(i,1);save();s.json(view(p,c))});
app.post('/api/posts/:id/comments',writeLimit,(q,s)=>{const p=find(q,s);if(!p)return;const text=clean(q.body.text,1000,1);
  if(text.length<2)return s.status(400).json({error:'Comment is empty'});if(p.comments.length>=500)return s.status(400).json({error:'Comment limit reached'});
  const par=q.body.parent?p.comments.find(c=>c.id===String(q.body.parent)):null;p.comments.push({id:rid(),author:clean(q.body.author,30)||'anon',text,parent:par?(par.parent||par.id):null,likes:[],created:Date.now()});save();s.status(201).json(view(p,cidOf(q),true))});
app.post('/api/posts/:id/comments/:cid/like',writeLimit,(q,s)=>{const p=find(q,s);if(!p)return;const c=cidOf(q),m=p.comments.find(x=>x.id===q.params.cid);if(!c||!m)return s.status(400).json({error:'Not found'});
  m.likes=m.likes||[];const i=m.likes.indexOf(c);i<0?m.likes.push(c):m.likes.splice(i,1);save();s.json(view(p,c,true))});
app.delete('/api/posts/:id/comments/:cid',needAdmin,(q,s)=>{const p=find(q,s);if(!p)return;p.comments=p.comments.filter(x=>x.id!==q.params.cid&&x.parent!==q.params.cid);save();s.json(view(p,cidOf(q),true))});
app.patch('/api/posts/:id/status',needAdmin,(q,s)=>{const p=find(q,s);if(!p)return;if(!STATUS.includes(q.body.status))return s.status(400).json({error:'Bad status'});p.status=q.body.status;save();s.json(view(p,cidOf(q)))});
app.delete('/api/posts/:id',needAdmin,(q,s)=>{const p=find(q,s);if(!p)return;p.images.forEach(n=>fs.unlink(path.join(UP,n),()=>{}));db.posts=db.posts.filter(x=>x!==p);save();s.json({ok:true})});
app.get('/api/admin/check',needAdmin,(q,s)=>s.json({ok:true}));

app.use((e,q,s,n)=>{const m=e instanceof multer.MulterError?(e.code==='LIMIT_FILE_SIZE'?'Image too large (max 2 MB)':'Upload error'):e.type==='entity.parse.failed'?'Invalid request':'Server error';if(m==='Server error')console.error(e);s.status(e.status||(m==='Server error'?500:400)).json({error:m})});
app.listen(process.env.PORT||3000,()=>console.log('QBTC Hub running'));
