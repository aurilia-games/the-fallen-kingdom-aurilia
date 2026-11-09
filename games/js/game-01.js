import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const $ = (id) => document.getElementById(id);
const canvas = $("world");

const ui = {
  loading: $("loading-screen"),
  error: $("error-screen"),
  errorText: $("error-message"),
  fallFlash: $("fall-flash"),
  intro: $("intro-screen"),
  question: $("question-screen"),
  message: $("message-screen"),
  over: $("game-over-screen"),
  victory: $("victory-screen"),
  toast: $("toast"),
  stage: $("stage-name"),
  subtitle: $("stage-subtitle"),
  lives: $("lives"),
  seals: $("seals"),
  score: $("score") || $("score-value") || $("run-score"),
  qStage: $("question-stage"),
  qProgress: $("question-progress"),
  qNumber: $("question-number"),
  qHint: $("question-hint"),
  yes: $("answer-yes"),
  no: $("answer-no"),
  mIcon: $("message-icon"),
  mEyebrow: $("message-eyebrow"),
  mTitle: $("message-title"),
  mCopy: $("message-copy"),
  mContinue: $("message-continue"),
  restart: $("restart-game"),
  replay: $("replay-game"),
  finalScore: $("final-score"),
  sound: $("sound-toggle"),
  nameInput: $("royal-player-name"),
  inscribeName: $("inscribe-name"),
  continueAnonymous: $("continue-anonymous"),
  nameError: $("royal-name-error")
};

let scene, camera, renderer, clock, knight, sword;
let paused = true, started = false, ended = false, lives = 3, score = 0, seals = 0, stageIndex = 0;
let activeTile = null, messageAction = null, jumpVelocity = 0, grounded = true;
let fallState = null, cameraShake = 0, debris = [];
let yaw = 0, pitch = 0.25, pointerDown = false, pointerX = 0, pointerY = 0;
let soundOn = (() => { try { return localStorage.getItem("aurilia.sound.enabled") !== "false"; } catch { return true; } })(), audioContext, toastTimer;
// Separate soundtrack from the existing Web Audio sound effects.
const gameMusic = new Audio("../assets/audio/game-01.mp3");
const victoryMusic = new Audio("../assets/audio/victory.mp3");
for (const track of [gameMusic, victoryMusic]) { track.loop = true; track.volume = 0.22; track.preload = "auto"; }
let activeMusic = gameMusic;
function syncSoundButton() {
  if (!ui.sound) return;
  ui.sound.textContent = `♫ SOUND: ${soundOn ? "ON" : "OFF"}`;
  ui.sound.setAttribute("aria-pressed", String(soundOn));
}
function playBackground(track = gameMusic) {
  if (activeMusic !== track) { activeMusic.pause(); activeMusic = track; }
  if (soundOn) activeMusic.play().catch(err => console.warn("Music could not start:", err));
}
function setSoundEnabled(enabled) {
  soundOn = enabled;
  try { localStorage.setItem("aurilia.sound.enabled", String(enabled)); } catch (_) {}
  syncSoundButton();
  if (soundOn) playBackground(activeMusic);
  else { gameMusic.pause(); victoryMusic.pause(); }
}
const SAVE_KEY = "aurilia.game01.progress.v2";
let totalXP = 0, earnedRunes = new Set(), runStartedAt = 0, dangerSeconds = 0, dangerActive = false;
let leaderboardSavedThisRun = false;
function loadProgress() {
  // Every Game 1 session starts with fresh XP.
  totalXP = 0;
  earnedRunes = new Set();
}

function saveProgress() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        xp: totalXP,
        earnedRunes: [...earnedRunes]
      })
    );
  } catch (error) {
    console.warn(
      "Game 1 progress could not be saved:",
      error
    );
  }
}


function submitRoyalName(anonymous = false) {
  if (!ended || leaderboardSavedThisRun) return;

  const enteredName = anonymous
    ? "Anonymous Knight"
    : (ui.nameInput?.value || "").trim();

  if (!enteredName && !anonymous) {
    if (ui.nameError) {
      ui.nameError.textContent =
        "Enter your knight name before inscribing it.";
    }
    ui.nameInput?.focus();
    return;
  }

  if (ui.nameError) {
    ui.nameError.textContent = "";
  }

  if (ui.inscribeName) {
    ui.inscribeName.disabled = true;
  }

  if (ui.continueAnonymous) {
    ui.continueAnonymous.disabled = true;
  }

  const knightSystem = window.AuriliaKnight;

  let saved = false;

  if (knightSystem) {
    try {
      knightSystem.activatePlayer(enteredName, {
        anonymous
      });

      knightSystem.claimPendingSummons();

      knightSystem.recordTrialResult(
        "game01",
        totalXP,
        true
      );

      saved = true;
      leaderboardSavedThisRun = true;
    } catch (error) {
      console.error("Game 1 profile could not be saved:", error);
    }
  }

  if (saved) {
    const inscription =
      document.getElementById("royal-inscription");

    if (inscription) {
      inscription.classList.add("inscription-complete");
    }

    if (ui.inscribeName) {
      ui.inscribeName.textContent = "NAME INSCRIBED ✦";
    }

    if (ui.continueAnonymous) {
      ui.continueAnonymous.hidden = true;
    }

    // Launch the epilogue after all four trials are completed.
    if (window.AuriliaKnight?.isCampaignComplete()) {
      setTimeout(() => {
        window.AuriliaKnight.checkAndLaunchEpilogue();
      }, 6000);
    }
  } else {
    if (ui.inscribeName) {
      ui.inscribeName.disabled = false;
    }

    if (ui.continueAnonymous) {
      ui.continueAnonymous.disabled = false;
    }

    if (ui.nameError) {
      ui.nameError.textContent =
        "The Royal Archive could not complete this entry. Please try again.";
    }
  }
}

function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function rankForXP(xp) {
  if (xp >= 450) return "Sovereign of Aurilia";
  if (xp >= 350) return "Crown Champion";
  if (xp >= 220) return "Royal Guardian";
  if (xp >= 120) return "Knight of Aurilia";
  if (xp >= 60) return "Seal Keeper";
  if (xp >= 20) return "Royal Initiate";
  return "Royal Candidate";
}
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function awardRuneXP(tile, stage) {
  const id = `g1-stage-${stage}-rune-${tile.number}`;

  // Each rune can reward XP only once per attempt.
  if (earnedRunes.has(id)) {
    toast("THIS RUNE HAS ALREADY REWARDED XP");
    return 0;
  }

  earnedRunes.add(id);

  // Maximum Game 1 XP is 150.
  totalXP = Math.min(150, totalXP + 10);

  saveProgress();

  toast(
    `+10 XP — ${totalXP} RUN XP · ${rankForXP(totalXP)}`
  );

  return 10;
}
function injectThreatStyle(){if(document.getElementById("aurilia-threat-style"))return;const st=document.createElement("style");st.id="aurilia-threat-style";st.textContent=`body.aurilia-danger:after{content:"THE CURSE IS CLOSING IN — MOVE NOW";position:fixed;z-index:9999;left:50%;top:14%;transform:translateX(-50%);padding:12px 22px;border:1px solid #ff5151;background:rgba(80,0,10,.9);color:#fff0e8;letter-spacing:.12em;font-weight:800;box-shadow:0 0 30px #b40022;animation:auriliaPulse .55s infinite alternate;pointer-events:none}@keyframes auriliaPulse{from{opacity:.65;filter:brightness(.8)}to{opacity:1;filter:brightness(1.5)}}`;document.head.appendChild(st);}
function updateThreat(dt){
  if(!started||paused||ended||fallState){dangerSeconds=0;dangerActive=false;document.body.classList.remove("aurilia-danger");return;}
  const stage=stages[stageIndex];const near=stage?.tiles.some(t=>!t.safe&&!t.completed&&Math.hypot(player.x-t.x,player.z-t.z)<2.7);
  dangerSeconds=near?dangerSeconds+dt:Math.max(0,dangerSeconds-dt*2);
  if(dangerSeconds>2.5&&!dangerActive){dangerActive=true;document.body.classList.add("aurilia-danger");playTone(170,.22,"sawtooth");setTimeout(()=>playTone(130,.24,"sawtooth"),220);}
  if(!near||dangerSeconds===0){dangerActive=false;document.body.classList.remove("aurilia-danger");}
}
const keys = {};
const player = { x: 0, y: 0, z: 10.5, speed: 5.1 };
const mats = {
  ground: new THREE.MeshStandardMaterial({color:0x24262d,roughness:.95}),
  stone: new THREE.MeshStandardMaterial({color:0x45464c,roughness:.9}),
  dark: new THREE.MeshStandardMaterial({color:0x17191f,roughness:.95}),
  gold: new THREE.MeshStandardMaterial({color:0xc39a4d,metalness:.6,roughness:.34,emissive:0x4a2b07,emissiveIntensity:.3}),
  rune: new THREE.MeshStandardMaterial({color:0xe6bf69,metalness:.3,roughness:.3,emissive:0x9a5f11,emissiveIntensity:.8}),
  safe: new THREE.MeshStandardMaterial({color:0xb88d40,metalness:.4,roughness:.35,emissive:0x7b510b,emissiveIntensity:1.1}),
  cursed: new THREE.MeshStandardMaterial({color:0xa42f37,roughness:.5,emissive:0x7e0710,emissiveIntensity:1.2}),
  armor: new THREE.MeshStandardMaterial({color:0x9ca3a8,metalness:.8,roughness:.28}),
  armorDark: new THREE.MeshStandardMaterial({color:0x313a43,metalness:.7,roughness:.38}),
  cape: new THREE.MeshStandardMaterial({color:0x6f2028,side:THREE.DoubleSide,roughness:.8}),
  black: new THREE.MeshStandardMaterial({color:0x111318,roughness:.9}),
  flame: new THREE.MeshBasicMaterial({color:0xffb94f})
};
const stages = [
  {
    name: "THE SHATTERED GROUNDS",
    subtitle: "Trial I · Identify perfect-square numbers",
    seal: "SEAL I",
    z: 4.8,
    tilesData: [
      {label:"9", safe:true, explain:"9 = 3 × 3, so 9 is a perfect square."},
      {label:"12", safe:false, explain:"12 is not a perfect square; it lies between 9 and 16."},
      {label:"16", safe:true, explain:"16 = 4 × 4, so 16 is a perfect square."},
      {label:"20", safe:false, explain:"20 lies between 16 and 25, so it is not a perfect square."},
      {label:"25", safe:true, explain:"25 = 5 × 5, so 25 is a perfect square."}
    ],
    tiles: [],
    completed: false
  },
  {
    name: "THE BROKEN CAUSEWAY",
    subtitle: "Trial II · Cross a narrower path of perfect squares",
    seal: "SEAL II",
    z: -6.5,
    tilesData: [
      {label:"36", safe:true, explain:"36 = 6 × 6, a perfect square."},
      {label:"40", safe:false, explain:"40 lies between 36 and 49, so it is not a perfect square."},
      {label:"49", safe:true, explain:"49 = 7 × 7, a perfect square."},
      {label:"50", safe:false, explain:"50 is just above 49, but it is not a perfect square."},
      {label:"64", safe:true, explain:"64 = 8 × 8, a perfect square."}
    ],
    tiles: [],
    completed: false
  },
  {
    name: "THE FORGOTTEN COURT",
    subtitle: "Trial III · Judge numbers close to square values",
    seal: "SEAL III",
    z: -17.8,
    tilesData: [
      {label:"81", safe:true, explain:"81 = 9 × 9, a perfect square."},
      {label:"80", safe:false, explain:"80 is one less than 81, so it is not a perfect square."},
      {label:"100", safe:true, explain:"100 = 10 × 10, a perfect square."},
      {label:"121", safe: true, explain:"121 = 11 × 11, a perfect square."},
      {label:"99", safe:false, explain:"99 is one less than 100, so it is not a perfect square."}
    ],
    tiles: [],
    completed: false
  },
  {
    name: "THE TRAITOR'S VAULT",
    subtitle: "Trial IV · Distinguish larger perfect squares",
    seal: "SEAL IV",
    z: -29.1,
    tilesData: [
      {label:"144", safe:true, explain:"144 = 12 × 12, a perfect square."},
      {label:"143", safe:false, explain:"143 lies just below 144, so it is not a perfect square."},
      {label:"169", safe:true, explain:"169 = 13 × 13, a perfect square."},
      {label:"170", safe:false, explain:"170 lies just above 169, so it is not a perfect square."},
      {label:"196", safe:true, explain:"196 = 14 × 14, a perfect square."}
    ],
    tiles: [],
    completed: false
  },
  {
    name: "THE RESTORATION THRONE",
    subtitle: "Trial V · Final test of perfect-square recognition",
    seal: "SEAL V",
    z: -40.4,
    tilesData: [
      {label:"225", safe:true, explain:"225 = 15 × 15, a perfect square."},
      {label:"224", safe:false, explain:"224 lies just below 225, so it is not a perfect square."},
      {label:"256", safe:true, explain:"256 = 16 × 16, a perfect square."},
      {label:"250", safe:false, explain:"250 lies between 225 and 256, so it is not a perfect square."},
      {label:"289", safe:true, explain:"289 = 17 × 17, a perfect square."}
    ],
    tiles: [],
    completed: false
  }
];
const gates = [], animatedFires = [], supportPlatforms = [];
const isPerfectSquare = n => Number.isInteger(Math.sqrt(n));

function box(parent,w,h,d,material,x,y,z,shadow=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z); mesh.castShadow=shadow; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function showError(error){
  console.error("Aurilia Game 01 error:",error);
  ui.errorText.textContent=(error?.message||String(error))+" — Check Live Server, internet access and WebGL support.";
  ui.error.classList.remove("hidden"); ui.loading.classList.add("done");
}
function init(){
  loadProgress(); injectThreatStyle();
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x111721); scene.fog=new THREE.FogExp2(0x111721,.019);
  camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,180);
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
  clock=new THREE.Clock();
  const objective=document.querySelector(".objective");if(objective){const copy=objective.querySelector("span:last-child");if(copy)copy.innerHTML="<b>YOUR OBJECTIVE</b><br>Restore five royal seals by identifying perfect squares. Leap between ancient runes, avoid false stones, and rebuild the ruined courtyard. Wrong runes collapse beneath you.";}
  const introCopy=document.querySelector(".intro-copy");if(introCopy)introCopy.textContent="The royal courtyard has fallen under a curse. Identify perfect-square numbers, leap across the broken stones, and restore five seals. Each correct rune brings Aurilia back to life; a false step costs a life.";
  const introNote=document.querySelector(".intro-note");if(introNote)introNote.textContent="✧ FIVE SEALS · PERFECT SQUARES ONLY · THREE LIVES";
  scene.add(new THREE.HemisphereLight(0xb7c6e3,0x17131a,2));
  const moon=new THREE.DirectionalLight(0xe0e8ff,3.1); moon.position.set(-8,17,8); moon.castShadow=false; scene.add(moon);
  const warm=new THREE.PointLight(0xffbd56,18,25,2); warm.name="aurilia-restoration-light"; warm.position.set(0,5,0); scene.add(warm);
  createWorld(); createKnight(); bindEvents(); resize(); updateHUD(); updateCamera(.1);
  setTimeout(()=>ui.loading.classList.add("done"),600);
}
function createWorld(){
  // No continuous floor: the knight must genuinely cross the gaps.
  const startPlatform=box(scene,8.8,.5,4.8,mats.ground,0,-.28,10.6,false);
  supportPlatforms.push({x:0,z:10.6,w:8.8,d:4.8});
  for (const stage of stages) {
    const startZ=stage.z+5.1;
    if (Math.abs(startZ-10.6) > 1.2) {
      box(scene,7.4,.5,2.5,mats.ground,0,-.28,startZ,false);
      supportPlatforms.push({x:0,z:startZ,w:7.4,d:2.5});
    }
    const landingZ=stage.z-5.8;
    box(scene,7.4,.5,2.5,mats.ground,0,-.28,landingZ,false);
    supportPlatforms.push({x:0,z:landingZ,w:7.4,d:2.5});
  }
  // Broken stone ribs frame the abyss, rather than filling it with a walkable slab.
  for(let z=14;z>=-49;z-=4.7) for(const side of [-1,1]) {
    const ledge=box(scene,1.1,.45,3.2,mats.dark,side*6.4,-.22,z,false);
    ledge.rotation.y=(Math.random()-.5)*.08;
  }
  for(const side of [-1,1]) for(let z=13;z>=-46;z-=6.2){
    const x=side*8; box(scene,1.05,5.5,1.05,mats.stone,x,2.35,z);
    box(scene,1.45,.38,1.45,mats.dark,x,5.2,z); box(scene,1.28,.3,1.28,mats.gold,x,-.05,z);
    const brazier=new THREE.Group(); brazier.position.set(side*6.4,1.05,z-1); scene.add(brazier);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.32,.48,.35,8),mats.dark); brazier.add(bowl);
    const fire=new THREE.Mesh(new THREE.OctahedronGeometry(.28),mats.flame); fire.position.y=.38; brazier.add(fire);
    const light=new THREE.PointLight(0xff8a36,4.5,8,2); light.position.y=.7; brazier.add(light);
    animatedFires.push({fire,light,phase:Math.random()*5});
  }
  box(scene,17,4.4,.8,mats.dark,0,1.7,-52.5,false);
  for(let x=-7;x<=7;x+=3.5){const chunk=box(scene,2.8,2.2+Math.random()*2.1,.9,mats.stone,x,1.4,-51.9);chunk.rotation.z=(Math.random()-.5)*.1;}
  box(scene,1,7.4,1,mats.stone,-3.7,3.2,-50.2); box(scene,1,7.4,1,mats.stone,3.7,3.2,-50.2); box(scene,8.1,.8,1.1,mats.stone,0,6.6,-50.2);
  // Broken masonry and glowing fissures give the courtyard a more dangerous silhouette.
  for (let i=0;i<16;i++) {
    const x=(Math.random()-.5)*14, z=12-Math.random()*61;
    const shard=box(scene,.22+Math.random()*.35,.2+Math.random()*.45,.25+Math.random()*.45,
      Math.random()>.5?mats.stone:mats.dark,x,-.02,z);
    shard.rotation.set(Math.random()*.4,Math.random()*Math.PI,Math.random()*.3);
  }
  // Each seal has its own route pattern. Safe runes (tiles 1, 3, 5) deliberately
  // change direction from seal to seal, so the journey is not always up-and-right.
  // Lateral steps stay within a playable jump distance; the other stones are decoys.
  const routePatterns = [
    [-2.45,  2.45,  0.00, -2.45,  2.45], // Seal I: left → centre → right
    [ 2.45, -2.45,  0.00,  2.45, -2.45], // Seal II: right → centre → left
    [ 0.00,  2.45, -2.45,  0.00,  2.45], // Seal III: centre → left → centre
    [-2.45,  2.45,  0.00, -2.45,  2.45], // Seal IV: left → centre → left (decoys reverse)
    [ 2.45, -2.45,  0.00,  2.45, -2.45]  // Seal V: right → centre → right (decoys reverse)
  ];
  stages.forEach((stage,si)=>{
    stage.tilesData.forEach((data,ti)=>{
      const lane=routePatterns[si][ti];
      stage.tiles.push(createTile(data,lane,stage.z+3.0-ti*1.5,si,ti));
    });
    stage.gate=createGate(stage.z-4.8,si); gates.push(stage.gate);
  });
  const positions=[]; for(let i=0;i<330;i++)positions.push((Math.random()-.5)*19,Math.random()*5.8,-49+Math.random()*65);
  const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xcda45a,size:.045,transparent:true,opacity:.6})));
}
function createTile(data,x,z,stageIdx,tileIdx){
  const number=data.label;
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  box(group,2.35,.18,2.35,mats.dark,0,-.015,0);
  const top=box(group,2.18,.09,2.18,mats.stone,0,.12,0);
  const inner=box(group,1.62,.025,1.62,mats.rune,0,.177,0,false);
  // Clear black rune number engraved visually into the stone surface (no floating plaque).
  const label=document.createElement("canvas");label.width=512;label.height=256;
  const ctx=label.getContext("2d");
  ctx.clearRect(0,0,label.width,label.height);
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`900 ${String(number).length>8?78:String(number).length>5?102:String(number).length>3?132:164}px Georgia, serif`;
  // A very thin warm edge separates the dark engraving from changing stone light, while the fill stays black.
  ctx.lineJoin="round";ctx.lineWidth=8;ctx.strokeStyle="rgba(241,220,169,.92)";ctx.strokeText(String(number),256,128);
  ctx.lineWidth=2;ctx.strokeStyle="rgba(0,0,0,.95)";ctx.strokeText(String(number),256,128);
  ctx.fillStyle="#080a0d";ctx.fillText(String(number),256,128);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=1;
  const labelMat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.34,.67),labelMat);
  face.rotation.x=-Math.PI/2;face.position.set(0,.198,0);face.renderOrder=2;group.add(face);
  for(const sx of [-.91,.91])for(const sz of [-.91,.91])box(group,.14,.05,.14,mats.gold,sx,.19,sz,false);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.12,.035,6,4),mats.rune);ring.rotation.x=Math.PI/2;ring.position.y=.19;group.add(ring);
  const glow=new THREE.PointLight(0xffb94f,1.5,3.8,2);glow.position.y=.65;group.add(glow);
  const crackMat=new THREE.MeshBasicMaterial({color:0xff3b37,transparent:true,opacity:0,depthWrite:false});
  const cracks=new THREE.Group();group.add(cracks);
  const crackPaths=[
    [[-.72,.235,.55],[-.35,.235,.18],[-.48,.235,-.12],[-.08,.235,-.65]],
    [[.42,.235,.72],[.1,.235,.32],[.42,.235,.02],[.18,.235,-.45]],
    [[-.78,.235,-.35],[-.35,.235,-.2],[-.05,.235,-.48]]
  ];
  for(const path of crackPaths){
    const points=path.map(p=>new THREE.Vector3(...p));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),crackMat);
    cracks.add(line);
  }
  return {number,x,z,stageIdx,tileIdx,group,top,inner,ring,glow,face,labelMat,cracks,crackMat,completed:false,inside:false,busy:false,anim:"idle",collapseUntil:0,phase:Math.random()*4,safe:data.safe,explain:data.explain};
}
function createGate(z,index){
  const group=new THREE.Group();group.position.set(0,0,z);scene.add(group);
  for(const x of [-2.5,2.5]){box(group,.55,4.5,.55,mats.dark,x,2,0);box(group,.78,.28,.78,mats.gold,x,4.25,0);}
  box(group,5.6,.4,.65,mats.dark,0,4.35,0);
  const doorLeft=box(group,2.02,3.5,.3,mats.cursed,-1.01,1.8,0);
  const doorRight=box(group,2.02,3.5,.3,mats.cursed,1.01,1.8,0);
  const emblem=new THREE.Mesh(new THREE.TorusGeometry(.72,.055,8,4),mats.rune);emblem.position.set(0,2,.22);group.add(emblem);
  const light=new THREE.PointLight(0xffb74b,2,7,2);light.position.set(0,2.3,1.1);group.add(light);
  return {group,doorLeft,doorRight,emblem,light,open:false,openProgress:0,index,z};
}
function createKnight(){
  knight=new THREE.Group();scene.add(knight);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.58,5,8),mats.armorDark);body.position.y=1.03;body.castShadow=true;knight.add(body);
  const chest=box(knight,.63,.57,.36,mats.armor,0,1.2,0);box(knight,.1,.55,.38,mats.gold,0,1.2,-.015,false);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),mats.armor);helmet.scale.set(1,1.05,.92);helmet.position.y=1.83;knight.add(helmet);
  box(knight,.43,.13,.38,mats.black,0,1.82,-.12,false);
  const cape=new THREE.Mesh(new THREE.BoxGeometry(.68,.85,.08),mats.cape);cape.position.set(0,1.12,.27);cape.rotation.x=-.12;knight.add(cape);
  for(const side of [-1,1]){
    const shoulder=new THREE.Mesh(new THREE.SphereGeometry(.2,8,8),mats.armor);shoulder.position.set(side*.48,1.38,0);knight.add(shoulder);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.38,4,6),mats.armorDark);arm.position.set(side*.5,1.06,0);arm.rotation.z=side*-.13;knight.add(arm);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.39,4,6),mats.armorDark);leg.position.set(side*.19,.42,0);knight.add(leg);
    box(knight,.31,.14,.43,mats.black,side*.19,.14,-.06,false);
  }
  sword=new THREE.Group();sword.position.set(-.67,1,-.02);sword.rotation.z=-.22;
  const blade=box(sword,.08,.88,.12,mats.armor,0,.48,0,false);box(sword,.36,.09,.16,mats.gold,0,.07,0,false);box(sword,.09,.24,.1,mats.black,0,-.1,0,false);knight.add(sword);
  knight.position.set(player.x,0,player.z);
}
function bindEvents(){
  addEventListener("resize",resize);
  // ENTER KEY — GAME 1
  addEventListener("keydown", (event) => {
    if (event.code !== "Enter" || event.repeat) return;

    // Allow typing the player's name normally.
    if (document.activeElement === ui.nameInput) {
      return;
    }

    // Let Enter activate a focused button.
    const focused = document.activeElement;

    if (
      focused instanceof HTMLButtonElement &&
      !focused.disabled &&
      focused.offsetParent !== null
    ) {
      return;
    }

    // Start the trial.
    if (!ui.intro.classList.contains("hidden")) {
      event.preventDefault();
      $("start-game").click();
      return;
    }

    // Continue after a story message.
    if (!ui.message.classList.contains("hidden")) {
      event.preventDefault();
      ui.mContinue.click();
      return;
    }

    // Do not automatically choose YES or NO.
    if (!ui.question.classList.contains("hidden")) {
      return;
    }

    // Game over: try again.
    if (!ui.over.classList.contains("hidden")) {
      event.preventDefault();
      ui.restart.click();
      return;
    }

    // Victory: do not automatically restart.
    // Player can choose a button manually.
  });
  addEventListener("keydown",e=>{if(ended||paused)return;keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Space"&&started&&!paused&&grounded){jumpVelocity=6.2;grounded=false;playTone(220,.07,"triangle");}});
  addEventListener("keyup",e=>keys[e.code]=false);
  addEventListener("blur",()=>{for(const code of Object.keys(keys))keys[code]=false;pointerDown=false;});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){for(const code of Object.keys(keys))keys[code]=false;pointerDown=false;}});
  canvas.addEventListener("pointerdown",e=>{pointerDown=true;pointerX=e.clientX;pointerY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
  addEventListener("pointerup",()=>pointerDown=false);
  addEventListener("pointermove",e=>{if(!pointerDown||paused)return;const dx=e.clientX-pointerX,dy=e.clientY-pointerY;pointerX=e.clientX;pointerY=e.clientY;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch+dy*.0025,-.08,.75);});
  $("start-game").addEventListener("click",()=>{ui.intro.classList.add("hidden");started=true;paused=false;runStartedAt=performance.now();playBackground(gameMusic);toast("THE CURSED RUNES ARE AWAKE");playTone(440,.15);});
  ui.yes.addEventListener("click",()=>answer(true));ui.no.addEventListener("click",()=>answer(false));
  ui.mContinue.addEventListener("click",()=>{ui.message.classList.add("hidden");const fn=messageAction;messageAction=null;if(fn)fn();});
  ui.restart.addEventListener("click",resetGame);ui.replay.addEventListener("click",resetGame);
  ui.inscribeName.addEventListener("click", () => {
    submitRoyalName(false);
  });

  ui.continueAnonymous.addEventListener("click", () => {
    submitRoyalName(true);
  });

  ui.nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRoyalName(false);
    }
  });

  ui.nameInput.addEventListener("input", () => {
    if (ui.nameError) {
      ui.nameError.textContent = "";
    }
  });

  syncSoundButton();
  ui.sound.addEventListener("click",()=>{setSoundEnabled(!soundOn);if(soundOn)playTone(520,.12);});
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function updateCamera(dt){
  const target=new THREE.Vector3(player.x,player.y+1.42,player.z),distance=6.0,horizontal=Math.cos(pitch)*distance;
  const shake = cameraShake>0 ? (Math.random()-.5)*cameraShake : 0;
  const desired=new THREE.Vector3(target.x+Math.sin(yaw)*horizontal+shake,target.y+.35+Math.sin(pitch)*distance+shake*.7,target.z+Math.cos(yaw)*horizontal);
  camera.position.lerp(desired,1-Math.exp(-7.5*dt));camera.lookAt(target);
  cameraShake=Math.max(0,cameraShake-dt*1.8);
}
function updatePlayer(dt){
  // Freeze all movement immediately after a win or game over.
  if(ended){for(const code of Object.keys(keys))keys[code]=false;return;}
  if (fallState) {
    fallState.elapsed += dt;fallState.velocity -= 18 * dt;player.y += fallState.velocity * dt;
    knight.position.set(player.x,player.y,player.z);knight.rotation.z=Math.sin(fallState.elapsed*14)*Math.min(.55,fallState.elapsed*.8);cameraShake=Math.max(cameraShake,.13);
    if(fallState.elapsed>1.05)recoverFromFall(fallState);
    return;
  }
  if(!started||paused||ended)return;
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),dir=new THREE.Vector3();
  if(keys.KeyW||keys.ArrowUp)dir.add(forward);if(keys.KeyS||keys.ArrowDown)dir.sub(forward);if(keys.KeyD||keys.ArrowRight)dir.add(right);if(keys.KeyA||keys.ArrowLeft)dir.sub(right);
  if(dir.lengthSq()>0){dir.normalize();player.x=THREE.MathUtils.clamp(player.x+dir.x*player.speed*dt,-7,7);player.z=THREE.MathUtils.clamp(player.z+dir.z*player.speed*dt,-50.5,15.5);knight.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI;sword.rotation.z=-.22+Math.sin(performance.now()*.009)*.06;}
  if(!grounded){player.y+=jumpVelocity*dt;jumpVelocity-=15.5*dt;if(player.y<=0){player.y=0;jumpVelocity=0;grounded=true;}}
  knight.position.set(player.x,player.y+(dir.lengthSq()>0?Math.abs(Math.sin(performance.now()*.012))*.025:0),player.z);
  const stage=stages[stageIndex];
  if(stage && stage.tiles.filter(t=>t.safe).every(t=>t.completed) && player.z<stage.gate.z-.45){
    if(stageIndex<stages.length-1){stage.completed=true;stageIndex++;seals=stageIndex;player.x=0;player.z=stages[stageIndex].z+5.1;knight.position.set(player.x,0,player.z);updateHUD();toast(`${stages[stageIndex-1].seal} RESTORED — NEXT TRIAL AWAITS`);playTone(620,.2,"triangle");}
    else{stage.completed=true;seals=stages.length;restoreCourtyard(seals);updateHUD();winGame();return;}
    if(ended)return;
  }
  // A missed jump is a fall too. Only the starting ledge, landing ledges and rune stones support the knight.
  if(grounded && !fallState && player.y===0 && !hasSupport(player.x,player.z)) startAbyssFall(null);
}
function hasSupport(x,z){
  if(supportPlatforms.some(p=>Math.abs(x-p.x)<p.w/2-.15 && Math.abs(z-p.z)<p.d/2-.15)) return true;
  return stages.some(stage=>stage.tiles.some(t=>Math.abs(x-t.x)<1.02 && Math.abs(z-t.z)<1.02 && t.group.position.y>-.15));
}
function checkTileContact(){
  if(!started||paused||ended||!grounded||fallState)return;
  const stage=stages[stageIndex];if(!stage)return;
  for(const tile of stage.tiles){
    const onTile=Math.abs(player.x-tile.x)<.82&&Math.abs(player.z-tile.z)<.82;
    if(onTile&&!tile.inside&&!tile.completed&&!tile.busy){
      tile.inside=true;
      if(tile.safe){
        tile.completed=true;tile.anim="safe";tile.top.material=mats.safe;tile.inner.material=mats.safe;tile.ring.material=mats.safe;tile.glow.color.set(0xffd77d);tile.glow.intensity=4;
        // Run score is earned every successful run; permanent XP remains one-time per rune.
        awardRuneXP(tile, stageIndex);

        updateHUD();

        if (ui.score) {
          ui.score.textContent = String(totalXP).padStart(3, "0");
          ui.score.classList.remove("score-pop");

          void ui.score.offsetWidth;

          ui.score.classList.add("score-pop");
        }

        playTone(660, 0.12, "triangle");

        restoreCourtyard(
          seals + (
            stage.tiles.filter(t => t.safe).every(t => t.completed)
              ? 1
              : 0
          )
        );
        const sealComplete = stage.tiles
          .filter(t => t.safe)
          .every(t => t.completed);

        if (sealComplete) {
          openGate(stage.gate);
          toast(`RUNE RESTORED — ${tile.explain} | SEAL RESTORED! RUN THROUGH THE GATE`);
        } else {
          toast(`RUNE RESTORED — ${tile.explain}`);
        }

      } else {
        tile.busy = true;
        tile.anim = "collapse";
        tile.collapseUntil = performance.now() + 1500;

        tile.top.material = mats.cursed;
        tile.inner.material = mats.cursed;
        tile.ring.material = mats.cursed;
        tile.crackMat.opacity = 1;
        tile.glow.color.set(0xff2028);
        tile.glow.intensity = 7;

        // WRONG RUNE — XP PENALTY
        totalXP = Math.max(0, totalXP - 5);
        lives = Math.max(0, lives - 1);

        saveProgress();
        updateHUD();
        startAbyssFall(tile);

        toast(`-5 XP · CURSED RUNE — ${tile.explain}`);
      }

      return;
    }
    if(!onTile)tile.inside=false;
  }
}
function startAbyssFall(tile){
  if(fallState)return;
  lives=Math.max(0,lives-(tile?0:1));updateHUD();
  grounded=false;jumpVelocity=-1.2;
  fallState={tile,elapsed:0,velocity:-1.8,checkpointZ:stages[stageIndex].z+5.1};
  ui.fallFlash.classList.add("active");cameraShake=.85;playTone(95,.48,"sawtooth");
  if(tile)spawnDebris(tile);
}
function recoverFromFall(state){
  fallState=null;ui.fallFlash.classList.remove("active");knight.rotation.z=0;
  player.y=0;jumpVelocity=0;grounded=true;player.x=0;player.z=state.checkpointZ;
  knight.position.set(player.x,0,player.z);yaw=0;pitch=.18;
  if(state.tile){state.tile.group.position.y=0;state.tile.anim="idle";state.tile.top.material=mats.stone;state.tile.inner.material=mats.rune;state.tile.ring.material=mats.rune;state.tile.crackMat.opacity=0;state.tile.glow.color.set(0xffb94f);state.tile.glow.intensity=1.5;state.tile.busy=false;state.tile.inside=false;}
  updateHUD();
  if(lives<=0){endGame();return;}
  const n=state.tile?.number;
  toast(n?`${n} IS NOT A PERFECT SQUARE. Try a glowing square rune.`:"MISSED THE JUMP — USE SPACE TO LEAP BETWEEN STONES.");
  paused=false;
}
function openQuestion(tile){ /* Educational choices are now part of traversal, not a quiz popup. */ }
function closeQuestion(){ui.question.classList.add("hidden");paused=false;activeTile=null;}
function answer(saysSquare){ /* Kept as a safe no-op for legacy UI hooks. */ }
function spawnDebris(tile){
  for(let i=0;i<14;i++){
    const piece=new THREE.Mesh(
      new THREE.BoxGeometry(.12+Math.random()*.2,.08+Math.random()*.16,.12+Math.random()*.2),
      Math.random()>.45?mats.cursed:mats.stone
    );
    piece.position.set(tile.x+(Math.random()-.5)*2.0,.2,tile.z+(Math.random()-.5)*2.0);
    piece.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);
    scene.add(piece);
    debris.push({mesh:piece,velocity:new THREE.Vector3((Math.random()-.5)*4,1+Math.random()*3,(Math.random()-.5)*4),life:1.3});
  }
}
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i];
    d.life-=dt;d.velocity.y-=12*dt;d.mesh.position.addScaledVector(d.velocity,dt);
    d.mesh.rotation.x+=dt*4;d.mesh.rotation.z+=dt*5;
    if(d.life<=0){scene.remove(d.mesh);d.mesh.geometry.dispose();debris.splice(i,1);}
  }
}
function restoreCourtyard(count){
  // Each seal gradually warms the ruins without replacing the original world art.
  const progress=Math.min(1,count/stages.length);
  scene.traverse(obj=>{if(obj.isMesh&&obj.material===mats.dark&&obj.position.y>1.4){obj.material=mats.stone;}});
  for(const f of animatedFires){f.light.intensity=4.2+progress*3.2;f.fire.material=mats.flame;}
  const warm=scene.getObjectByName("aurilia-restoration-light");if(warm&&warm.isLight)warm.intensity=8+progress*18;
  scene.fog.density=Math.max(.007,.019-progress*.008);
}
function openGate(gate){if(gate.open)return;gate.open=true;gate.openProgress=0;playTone(490,.25);toast(`${stages[gate.index].seal} RESTORED — THE ROYAL GATES ARE OPENING`);}
function message(icon,eyebrow,title,copy,action){ui.mIcon.textContent=icon;ui.mEyebrow.textContent=eyebrow;ui.mTitle.textContent=title;ui.mCopy.textContent=copy;messageAction=action;ui.message.classList.remove("hidden");paused=true;}
function updateHUD() {
  ui.lives.textContent = Array.from(
    { length: 3 },
    (_, i) => i < lives ? "♥" : "♡"
  ).join(" ");

  ui.seals.textContent = `${seals} / ${stages.length}`;

  if (ui.score) {
    ui.score.textContent = String(totalXP).padStart(3, "0");

    ui.score.title =
      `Current Run XP: ${totalXP}`;
  }

  if (stages[stageIndex]) {
    ui.stage.textContent = stages[stageIndex].name;
    ui.subtitle.textContent = stages[stageIndex].subtitle;
  }
}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove("visible"),2200);}
function playTone(freq,duration,type="sine"){if(!soundOn)return;try{audioContext||=new(window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(.07,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);}catch(e){console.warn("Audio unavailable",e);}}
function endGame() {
  if (ended) return;

  // Save the latest failed attempt to the active player.
  window.AuriliaKnight?.recordTrialResult(
    "game01",
    totalXP,
    false
  );

  ended = true;
  paused = true;
  fallState = null;
  jumpVelocity = 0;
  grounded = true;

  for (const code of Object.keys(keys)) {
    keys[code] = false;
  }

  pointerDown = false;
  dangerSeconds = 0;
  dangerActive = false;

  document.body.classList.remove("aurilia-danger");
  ui.fallFlash.classList.remove("active");
  ui.message.classList.add("hidden");
  ui.over.classList.remove("hidden");
}

function winGame() {
  if (ended) return;

  const latestXP = Math.max(
    0,
    Math.min(150, Number(totalXP) || 0)
  );

  console.log("GAME 1 LATEST XP:", latestXP);

  // Existing players keep their active profile.
  // Only new players need to inscribe a name.
  const knightSystem = window.AuriliaKnight;
  const activeCampaign = knightSystem?.loadCampaign?.();
  const existingPlayer = Boolean(activeCampaign?.playerName);

  // PERSONALIZED ROYAL VICTORY MESSAGE
  const victoryName = document.getElementById("victory-knight-name");

  if (victoryName) {
    const playerName = activeCampaign?.playerName?.trim();

    victoryName.textContent = playerName
      ? `KNIGHT ${playerName.toUpperCase()}!`
      : "KNIGHT!";
  }

  if (existingPlayer) {
    knightSystem.recordTrialResult("game01", latestXP, true);
  }

  ended = true;
  paused = true;
  fallState = null;
  jumpVelocity = 0;
  grounded = true;

  leaderboardSavedThisRun = false;

  for (const code of Object.keys(keys)) {
    keys[code] = false;
  }

  pointerDown = false;
  dangerSeconds = 0;
  dangerActive = false;

  document.body.classList.remove("aurilia-danger");

  ui.finalScore.textContent =
    String(totalXP).padStart(3, "0");

  const inscription =
    document.getElementById("royal-inscription");

  if (inscription) {
    inscription.classList.toggle(
      "inscription-complete",
      existingPlayer
    );

    inscription.hidden = existingPlayer;
  }

  if (ui.nameInput) {
    ui.nameInput.value = "";
    ui.nameInput.disabled = existingPlayer;
  }

  if (ui.nameError) {
    ui.nameError.textContent = "";
  }

  if (ui.inscribeName) {
    ui.inscribeName.disabled = false;
    ui.inscribeName.innerHTML =
      'INSCRIBE MY NAME <span>✦</span>';
  }

  if (ui.continueAnonymous) {
    ui.continueAnonymous.disabled = false;
    ui.continueAnonymous.hidden = false;
  }

  ui.victory.classList.remove("hidden");
  playBackground(victoryMusic);

  playTone(780, 0.35, "triangle");

  // Existing players enter the epilogue after completing all four trials.
  if (
    existingPlayer &&
    window.AuriliaKnight?.isCampaignComplete()
  ) {
    setTimeout(() => {
      window.AuriliaKnight.checkAndLaunchEpilogue();
    }, 1000);
  }

  requestAnimationFrame(() => {
    if (
      !existingPlayer &&
      !ui.victory.classList.contains("hidden")
    ) {
      ui.nameInput?.focus({ preventScroll: true });
    }
  });
}

function resetGame() {
  leaderboardSavedThisRun = false;
  victoryMusic.pause();
  victoryMusic.currentTime = 0;
  playBackground(gameMusic);

  // Start a completely fresh attempt.
  totalXP = 0;
  earnedRunes = new Set();

  // Clear only the previous run's temporary progress.
  // Do NOT touch the campaign or leaderboard.
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn("Could not clear run progress:", error);
  }

  for(const code of Object.keys(keys))keys[code]=false;pointerDown=false;activeTile=null;messageAction=null;
  stageIndex=0;lives=3;score=0;seals=0;started=true;paused=false;ended=false;runStartedAt=performance.now();dangerSeconds=0;dangerActive=false;document.body.classList.remove("aurilia-danger");player.x=0;player.y=0;player.z=10.5;jumpVelocity=0;grounded=true;yaw=0;pitch=.18;
  fallState=null;ui.fallFlash.classList.remove("active");cameraShake=0;debris.forEach(d=>scene.remove(d.mesh));debris=[];
  stages.forEach(s=>{s.completed=false;s.tiles.forEach(t=>{t.completed=false;t.inside=false;t.busy=false;t.anim="idle";t.group.position.y=0;t.top.material=mats.stone;t.inner.material=mats.rune;t.ring.material=mats.rune;t.crackMat.opacity=0;t.glow.color.set(0xffb94f);t.glow.intensity=1.5;});s.gate.open=false;s.gate.openProgress=0;s.gate.group.visible=true;s.gate.doorLeft.visible=true;s.gate.doorRight.visible=true;s.gate.doorLeft.position.x=-1.01;s.gate.doorRight.position.x=1.01;s.gate.doorLeft.rotation.y=0;s.gate.doorRight.rotation.y=0;s.gate.emblem.visible=true;s.gate.emblem.material=mats.rune;s.gate.light.intensity=2;s.gate.doorLeft.material=mats.cursed;s.gate.doorRight.material=mats.cursed;s.gate.light.intensity=2;});
  [ui.question,ui.message,ui.over,ui.victory,ui.intro].forEach(el=>el.classList.add("hidden"));knight.position.set(0,0,player.z);updateHUD();toast("THE KNIGHT RETURNS");
}
function updateAnimations(dt,time){
  for(const gate of gates){
    if(gate.open && gate.openProgress<1){
      gate.openProgress=Math.min(1,gate.openProgress+dt*0.72);
      const eased=gate.openProgress*gate.openProgress*(3-2*gate.openProgress);
      gate.doorLeft.position.x=-1.01-2.2*eased;
      gate.doorRight.position.x=1.01+2.2*eased;
      gate.doorLeft.rotation.y=-0.12*eased;
      gate.doorRight.rotation.y=0.12*eased;
      gate.emblem.material=mats.gold;
      gate.light.intensity=2+4*Math.sin(Math.min(1,gate.openProgress)*Math.PI);
      if(gate.openProgress>=1){gate.group.visible=false;gate.doorLeft.visible=false;gate.doorRight.visible=false;gate.emblem.visible=false;gate.light.intensity=0;}
    }
  }
  for(const s of stages)for(const t of s.tiles){
    t.phase+=dt;
    if(t.anim==="idle"&&!t.completed){
      t.ring.rotation.z=Math.sin(time*.65+t.phase)*.025;
      // The number stays solid black and readable at every distance; only the rune's amber aura responds to proximity.
      const distance=Math.hypot(player.x-t.x,player.z-t.z);
      const approach=Math.max(0,1-distance/8);
      t.glow.intensity=.62+approach*1.35+(Math.sin(time*2.2+t.phase)+1)*.12;
      t.glow.distance=3.1+approach*2.0;
      // Only nearby rune lights participate in rendering; this reduces GPU load and stutter.
      t.glow.visible=distance<10;
      t.inner.material.emissiveIntensity=.12+approach*.24;
    }
    if(t.anim==="collapse"){const remain=t.collapseUntil-performance.now();t.group.position.y=remain>0?-.62*(1-remain/1500):0;if(remain<=0&&!fallState){t.group.position.y=0;t.anim="idle";t.top.material=mats.stone;t.inner.material=mats.rune;t.ring.material=mats.rune;t.crackMat.opacity=0;t.glow.color.set(0xffb94f);t.glow.intensity=1.5;}}
    if(t.anim==="safe"){t.ring.rotation.z+=dt*.35;t.glow.intensity=3.2+Math.sin(time*3+t.phase)*.45;}
  }
  for(const f of animatedFires){f.fire.position.y=.38+Math.sin(time*7+f.phase)*.08;f.fire.scale.setScalar(.85+Math.sin(time*11+f.phase)*.16);f.light.intensity=4.2+Math.sin(time*9+f.phase)*1.1;}
}
function animate(){requestAnimationFrame(animate);if(!renderer)return;const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;if(!ended){updatePlayer(dt);checkTileContact();updateThreat(dt);}else{for(const code of Object.keys(keys))keys[code]=false;}updateCamera(dt);updateAnimations(dt,time);updateDebris(dt);renderer.render(scene,camera);}
try{init();animate();}catch(error){showError(error);}