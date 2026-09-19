const SUPABASE_URL="https://nfwesibtnvliuiqxabfp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_2PGpbqPSgnXYDEB74EEzCg_fNG-ZHt1";
const CASHQUEST_SITE_URL="https://cash-quest-mvp.vercel.app/";
let supabaseClient=null;
let authMode="signup";

const quests=[
 {title:"Check a store display",biz:"Example business",reward:"$3.00",time:"3 min",icon:"📸",tag:"Nearby"},
 {title:"Answer a short survey",biz:"Example business",reward:"$1.25",time:"1 min",icon:"📝",tag:"Online"},
 {title:"Verify business hours",biz:"Example business",reward:"$1.75",time:"2 min",icon:"🕐",tag:"Nearby"},
 {title:"Find a product on a shelf",biz:"Example business",reward:"$4.00",time:"5 min",icon:"🛒",tag:"Nearby"}
];

function openAuth(){
 const m=document.getElementById("authModal");
 if(!m)return;
 m.classList.add("open");
 m.setAttribute("aria-hidden","false");
}
function closeAuth(){
 const m=document.getElementById("authModal");
 if(!m)return;
 m.classList.remove("open");
 m.setAttribute("aria-hidden","true");
}
function setAuthStatus(msg){
 const e=document.getElementById("authStatus");
 if(e)e.textContent=msg||"";
}
function toggleAuthMode(){
 authMode=authMode==="signup"?"signin":"signup";
 document.getElementById("authTitle").textContent=authMode==="signup"?"Create your account":"Welcome back";
 document.getElementById("authNote").textContent=authMode==="signup"?"Join CashQuest to prepare for the live marketplace.":"Sign in to your CashQuest account.";
 document.getElementById("authSubmit").textContent=authMode==="signup"?"Create account":"Sign in";
 document.getElementById("authSwitch").textContent=authMode==="signup"?"Already have an account? Sign in":"Need an account? Create one";
 document.getElementById("authPassword").setAttribute("autocomplete",authMode==="signup"?"new-password":"current-password");
 setAuthStatus("");
}

function showTab(id){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 const view=document.getElementById(id);
 if(view)view.classList.add("active");
 window.scrollTo({top:0,behavior:"smooth"});
}
function render(){
 const list=document.getElementById("questList");
 if(!list)return;
 list.innerHTML=quests.map(q=>'<article class="card"><div class="cardtop"><span class="icon">'+q.icon+'</span><span class="tag">'+q.tag+'</span></div><h3>'+q.title+'</h3><p class="biz">'+q.biz+'</p><div class="meta"><span>⏱ '+q.time+'</span><strong>'+q.reward+'</strong></div><button class="example" onclick="alert(\'This is an example quest. Real paid quests will appear after CashQuest launches its account, payment and verification systems.\')">Example — not claimable yet</button></article>').join("");
}

function openAccount(user){
 showTab("account");
 const email=user&&user.email?user.email:"Signed-in user";
 const e=document.getElementById("accountEmail");
 const n=document.getElementById("accountName");
 if(e)e.textContent=email;
 if(n)n.textContent=email.split("@")[0]||"CashQuest user";
}
async function signOutUser(){
 if(supabaseClient)await supabaseClient.auth.signOut();
 showTab("quests");
 updateAuthButton(null);
}

async function ensureProfile(user){
 if(!supabaseClient||!user)return;
 const displayName=(user.email||"").split("@")[0]||"CashQuest user";
 const result=await supabaseClient.from("profiles").upsert(
  {id:user.id,display_name:displayName,role:"worker"},
  {onConflict:"id"}
 );
 if(result.error)console.error("Profile setup:",result.error.message);
}

async function updateAuthButton(user){
 const b=document.getElementById("authButton");
 if(!b)return;
 if(user){
  b.textContent="Account";
  b.onclick=function(){openAccount(user);};
 }else{
  b.textContent="Sign in / Join";
  b.onclick=openAuth;
 }
}

async function initAuth(){
 if(!window.supabase){
  console.error("Supabase library did not load");
  return;
 }
 try{
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  const result=await supabaseClient.auth.getUser();
  await updateAuthButton(result.data.user||null);
  supabaseClient.auth.onAuthStateChange(function(event,session){
   const user=session&&session.user?session.user:null;
   updateAuthButton(user);
   if(user){ensureProfile(user);loadCampaigns();}else loadCampaigns();
  });
 }catch(err){
  console.error("Auth initialization:",err);
 }
}

function escapeHtml(value){
 return String(value).replace(/[&<>"']/g,function(ch){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
 });
}
let campaignDrafts=[];
async function loadCampaigns(){
 const el=document.getElementById("campaignList"); if(!el)return;
 if(!supabaseClient){el.innerHTML='<article class="card"><h3>Connect to your account</h3><p class="biz">Sign in to load your campaigns.</p></article>';return;}
 const {data:userData}=await supabaseClient.auth.getUser(); const user=userData?.user;
 if(!user){el.innerHTML='<article class="card"><h3>Sign in required</h3><p class="biz">Sign in to create and manage campaigns.</p></article>';return;}
 const {data,error}=await supabaseClient.from("campaigns").select("*").order("created_at",{ascending:false});
 if(error){console.error(error);el.innerHTML='<article class="card"><h3>Could not load campaigns</h3><p class="biz">'+escapeHtml(error.message)+'</p></article>';return;}
 campaignDrafts=data||[];
 if(!campaignDrafts.length){el.innerHTML='<article class="card"><h3>No campaigns yet</h3><p class="biz">Create a campaign draft above. Live funding and worker matching come later.</p></article>';return;}
 el.innerHTML=campaignDrafts.map(function(q){return '<article class="card"><div class="cardtop"><span class="icon">📋</span><span class="tag">'+escapeHtml(q.status.toUpperCase())+'</span></div><h3>'+escapeHtml(q.title)+'</h3><p class="biz">'+escapeHtml(q.description)+'</p><div class="meta"><span>'+q.workers_needed+' workers</span><strong>$'+(Number(q.reward_cents)/100).toFixed(2)+'</strong></div><p class="biz">Worker budget: $'+(Number(q.reward_cents)*Number(q.workers_needed)/100).toFixed(2)+'</p><button class="example" onclick="deleteCampaign('+q.id+')">Delete draft</button></article>';}).join("");
}
async function deleteCampaign(id){if(!supabaseClient)return;const {error}=await supabaseClient.from("campaigns").delete().eq("id",id);if(error){alert(error.message);return;}loadCampaigns();}
function updateCampaignPreview(){
 const reward=Number((document.getElementById("campaignReward")||{}).value||0);
 const workers=Number((document.getElementById("campaignWorkers")||{}).value||0);
 const r=document.getElementById("campaignRewardPreview");
 const w=document.getElementById("campaignWorkersPreview");
 const b=document.getElementById("campaignBudgetPreview");
 if(r)r.textContent="$"+reward.toFixed(2);
 if(w)w.textContent=workers.toLocaleString();
 if(b)b.textContent="$"+(reward*workers).toFixed(2);
}
function setupBusiness(){
 const form=document.getElementById("campaignForm");
 if(!form)return;
 ["campaignReward","campaignWorkers"].forEach(function(id){
  const input=document.getElementById(id);
  if(input)input.addEventListener("input",updateCampaignPreview);
 });
 form.addEventListener("submit",function(e){
  e.preventDefault();
  const title=document.getElementById("campaignTitle").value.trim();
  const description=document.getElementById("campaignDescription").value.trim();
  const reward=Number(document.getElementById("campaignReward").value);
  const workers=Number(document.getElementById("campaignWorkers").value);
  const {data:userData}=await supabaseClient.auth.getUser();
  if(!userData?.user){document.getElementById("campaignStatus").textContent="Please sign in before saving a campaign.";return;}
  const {error}=await supabaseClient.from("campaigns").insert({title:title,description:description,reward_cents:Math.round(reward*100),workers_needed:workers,status:"draft",created_by:userData.user.id});
  if(error){document.getElementById("campaignStatus").textContent=error.message;return;}
  document.getElementById("campaignStatus").textContent="Campaign draft saved to CashQuest.";
  form.reset();
  updateCampaignPreview();
  loadCampaigns();
 });
 loadCampaigns();
 updateCampaignPreview();
}

document.addEventListener("DOMContentLoaded",function(){
 document.querySelectorAll("[data-tab]").forEach(function(button){
  button.addEventListener("click",function(){showTab(button.dataset.tab);});
 });
 const form=document.getElementById("authForm");
 if(form)form.addEventListener("submit",async function(e){
  e.preventDefault();
  if(!supabaseClient)await initAuth();
  if(!supabaseClient){setAuthStatus("Account service is unavailable. Please refresh and try again.");return;}
  const email=document.getElementById("authEmail").value.trim();
  const password=document.getElementById("authPassword").value;
  const submit=document.getElementById("authSubmit");
  setAuthStatus("Working…");
  submit.disabled=true;
  try{
   if(authMode==="signup"){
    const result=await supabaseClient.auth.signUp({email:email,password:password,options:{emailRedirectTo:CASHQUEST_SITE_URL}});
    if(result.error)throw result.error;
    setAuthStatus(result.data.session?"Account created and signed in.":"Account created. Check your email to confirm your address, then sign in.");
   }else{
    const result=await supabaseClient.auth.signInWithPassword({email:email,password:password});
    if(result.error)throw result.error;
    await ensureProfile(result.data.user);
    updateAuthButton(result.data.user);
    await loadCampaigns();
    setAuthStatus("Signed in!");
    setTimeout(closeAuth,500);
   }
  }catch(err){
   setAuthStatus(err&&err.message?err.message:"Something went wrong.");
  }finally{
   submit.disabled=false;
  }
 });
 render();
 setupBusiness();
 initAuth();
});