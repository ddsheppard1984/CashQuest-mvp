const SUPABASE_URL="https://nfwesibtnvliuiqxabfp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_2PGpbqPSgnXYDEB74EEzCg_fNG-ZHt1";
let supabaseClient=null;
let authMode="signup";

function openAuth(){const m=document.getElementById("authModal");if(!m)return;m.classList.add("open");m.setAttribute("aria-hidden","false");setAuthStatus("")}
function closeAuth(){const m=document.getElementById("authModal");if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true")}
function setAuthStatus(msg){const e=document.getElementById("authStatus");if(e)e.textContent=msg}
function toggleAuthMode(){authMode=authMode==="signup"?"signin":"signup";document.getElementById("authTitle").textContent=authMode==="signup"?"Create your account":"Welcome back";document.getElementById("authNote").textContent=authMode==="signup"?"Join CashQuest to prepare for the live marketplace.":"Sign in to your CashQuest account.";document.getElementById("authSubmit").textContent=authMode==="signup"?"Create account":"Sign in";document.getElementById("authSwitch").textContent=authMode==="signup"?"Already have an account? Sign in":"Need an account? Create one";document.getElementById("authPassword").setAttribute("autocomplete",authMode==="signup"?"new-password":"current-password");setAuthStatus("")}

const quests=[{title:"Check a store display",biz:"Example business",reward:"$3.00",time:"3 min",icon:"📸",tag:"Nearby"},{title:"Answer a short survey",biz:"Example business",reward:"$1.25",time:"1 min",icon:"📝",tag:"Online"},{title:"Verify business hours",biz:"Example business",reward:"$1.75",time:"2 min",icon:"🕐",tag:"Nearby"},{title:"Find a product on a shelf",biz:"Example business",reward:"$4.00",time:"5 min",icon:"🛒",tag:"Nearby"}];
function render(){document.getElementById("questList").innerHTML=quests.map(q=>`<article class="card"><div class="cardtop"><span class="icon">${q.icon}</span><span class="tag">${q.tag}</span></div><h3>${q.title}</h3><p class="biz">${q.biz}</p><div class="meta"><span>⏱ ${q.time}</span><strong>${q.reward}</strong></div><button class="example" onclick="alert('This is an example quest. Real paid quests will appear after CashQuest launches its account, payment and verification systems.')">Example — not claimable yet</button></article>`).join("")}
function showTab(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

async function initAuth(){
  if(!window.supabase){console.error("Supabase library did not load");return}
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  const {data}=await supabaseClient.auth.getUser();
  updateAuthButton(data.user);
  supabaseClient.auth.onAuthStateChange((_event,session)=>{updateAuthButton(session?.user||null);if(session?.user)ensureProfile(session.user)});
}
async function ensureProfile(user){
  if(!supabaseClient||!user)return;
  const displayName=(user.email||"").split("@")[0]||"CashQuest user";
  const {error}=await supabaseClient.from("profiles").upsert(
    {id:user.id,display_name:displayName,role:"worker"},
    {onConflict:"id"}
  );
  if(error)console.error("Profile setup:",error.message);
}
async function updateAuthButton(userOverride){
  let user=userOverride;
  if(user===undefined && supabaseClient){const r=await supabaseClient.auth.getUser();user=r.data.user}
  const b=document.getElementById("authButton");if(!b)return;
  if(user){b.textContent="Account";b.onclick=()=>alert("Signed in as "+user.email+" — account dashboard coming next.")}
  else{b.textContent="Sign in / Join";b.onclick=openAuth}
}

const form=document.getElementById("authForm");
if(form)form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabaseClient){setAuthStatus("The account service is still loading. Please wait a moment and try again.");await initAuth();if(!supabaseClient)return}
  const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;
  setAuthStatus("Working…");document.getElementById("authSubmit").disabled=true;
  try{
    if(authMode==="signup"){
      const {data,error}=await supabaseClient.auth.signUp({email,password});
      if(error)throw error;
      setAuthStatus(data.session?"Account created and signed in.":"Account created. Check your email to confirm your address, then sign in.");
    }else{
      const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
      if(error)throw error;setAuthStatus("Signed in!");updateAuthButton(data.user);ensureProfile(data.user);setTimeout(closeAuth,700);
    }
  }catch(err){setAuthStatus(err.message||"Something went wrong.")}finally{document.getElementById("authSubmit").disabled=false}
});
render();
const authButton=document.getElementById("authButton");
if(authButton)authButton.addEventListener("click",openAuth);
updateAuthButton();
initAuth();