/* AURILIA / STARFALL CITADEL — PURE CANVAS CINEMATIC
   No images, models, CSS files, libraries, network calls or dependencies.
   API: window.AuriliaCinematic.start() -> Promise; .stop()
*/
(() => {
  'use strict';
  let current = null;
  const TAU = Math.PI * 2;
  const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease = v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;
  const DURATION=28;
  function path(ctx,pts,fill,stroke=null,lw=1){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
  function line(ctx,pts,color,width=1){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();}
  function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function star(ctx,x,y,r,a){ctx.save();ctx.globalAlpha=a;glow(ctx,x,y,r*6,'rgba(196,211,255,.25)');ctx.strokeStyle='#f7e8cb';ctx.lineWidth=Math.max(.6,r*.28);line(ctx,[[x-r*2,y],[x+r*2,y]],'#f4e9d7',Math.max(.6,r*.3));line(ctx,[[x,y-r*2],[x,y+r*2]],'#f4e9d7',Math.max(.6,r*.3));ctx.restore();}
  function dragon(ctx,x,y,s,{bow=0,wing=0,flight=false,breath=0}={}){
    ctx.save();ctx.translate(x,y);ctx.scale(-s,s);
    // Tail with smooth tapered segments
    ctx.save();ctx.translate(-132,16);ctx.rotate(Math.sin(wing*.4)*.07);
    path(ctx,[[0,0],[-63,7],[-125,-14],[-180,-9],[-228,21],[-201,7],[-174,10],[-123,8],[-56,23]],'#182238','#62718b',1.5);
    for(let i=0;i<5;i++)path(ctx,[[-55-i*27,3-i*1.2],[-63-i*27,-12-i*2],[-72-i*27,4-i*1.2]],'#6e7995');ctx.restore();
    // Far wing
    ctx.save();ctx.translate(-52,-31);ctx.rotate(-.08+Math.sin(wing)*.25);
    path(ctx,[[0,0],[-75,-126],[-178,-204],[-148,-116],[-206,-111],[-157,-64],[-170,-22],[-75,-40]],'#24334e','#a39caa',2);
    line(ctx,[[0,0],[-75,-126],[-178,-204]],'#7b7e98',3);
    ctx.restore();
    // Back legs
    path(ctx,[[-96,19],[-126,66],[-125,89],[-155,95],[-137,100],[-111,99],[-92,66],[-68,35]],'#1d2a40','#69758d',2);
    path(ctx,[[57,19],[38,76],[60,94],[91,94],[70,103],[29,104],[11,72],[12,20]],'#24334b','#7b8398',2);
    // Body
    ellipse(ctx,-20,4,145,59,'#26334c');
    path(ctx,[[-130,6],[-98,35],[-33,53],[59,39],[119,14],[78,51],[-12,65],[-98,48]],'#34435a');
    for(let i=0;i<7;i++){const px=-108+i*31;path(ctx,[[px,-36],[px+11,-68-(i%3)*7],[px+21,-33]],'#6d7893','#a0a4ad',1);}
    // Layered scales along the shoulder and flank, fixed in body coordinates.
    ctx.save();ctx.globalAlpha=.62;
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){
      const px=-117+i*24+(row%2)*11,py=-18+row*19;
      ctx.beginPath();ctx.ellipse(px,py,9,4.2,-.12,0,Math.PI);
      ctx.strokeStyle=row===0?'#9babc5':'#6b809e';ctx.lineWidth=1.35;ctx.stroke();
    }
    ctx.restore();
    // Reflected moonlight over the dragon's upper back.
    line(ctx,[[-124,-18],[-84,-43],[-28,-51],[35,-39],[78,-17]],'rgba(181,202,232,.45)',2.3);
    // Near wing - animated around shoulder
    ctx.save();ctx.translate(-17,-34);ctx.rotate(flight?(-.12+Math.sin(wing)*.37):(-.12+Math.sin(wing)*.055));
    path(ctx,[[0,0],[-45,-110],[-132,-224],[-129,-140],[-197,-167],[-173,-102],[-227,-90],[-159,-53],[-185,-7],[-93,-30]],'#34425e','#a3a2b1',2.5);
    path(ctx,[[-45,-110],[-132,-224],[-129,-140],[-197,-167],[-173,-102],[-227,-90],[-159,-53]],'rgba(126,112,166,.24)');
    line(ctx,[[0,0],[-45,-110],[-132,-224]],'#a4a0a8',4);
    line(ctx,[[-45,-110],[-129,-140]],'#66758e',2);
    line(ctx,[[-45,-110],[-173,-102]],'#66758e',2);
    // Membrane veins and silver-blue edge glints.
    line(ctx,[[-46,-109],[-196,-165]],'rgba(183,196,226,.42)',1.3);
    line(ctx,[[-46,-109],[-226,-90]],'rgba(183,196,226,.34)',1.3);
    ctx.restore();
    // Neck and head are lowered by changing anatomical geometry, not whole-dragon tilt
    const hx=186-bow*14,hy=-62+bow*96;
    path(ctx,[[65,-20],[95,-63+bow*24],[132,-102+bow*63],[hx-13,hy-16],[hx+7,hy+21],[133,-54+bow*51],[102,10],[58,23]],'#28384f','#8790a4',2.5);
    for(let i=0;i<5;i++){const a=i/5;const px=mix(91,hx-16,a),py=mix(-53+bow*28,hy-15,a);path(ctx,[[px-10,py-5],[px-6,py-25],[px+11,py-7]],'#7d849d');}
    ctx.save();ctx.translate(hx,hy);ctx.rotate(bow*.23);
    path(ctx,[[-23,-28],[18,-40],[58,-20],[84,-1],[68,18],[20,22],[-18,11]],'#35445d','#a5a8b1',2.3);
    path(ctx,[[13,16],[78,9],[64,25],[29,31]],'#202a3c','#777f93',1.5);
    path(ctx,[[3,-27],[13,-67],[34,-34]],'#79819b');path(ctx,[[35,-27],[52,-56],[60,-15]],'#7c829b');
    ellipse(ctx,38,-9,6,4,'#ffe2a0');ellipse(ctx,40,-9,2.3,2,'#fff');
    ellipse(ctx,75,1,3,2,'#101a2b');
    line(ctx,[[12,-22],[30,-25],[51,-13]],'rgba(205,221,246,.58)',1.7);
    for(let i=0;i<5;i++){
      const sx=-9+i*13,sy=-5+(i%2)*7;
      line(ctx,[[sx,sy],[sx+8,sy+3]],'rgba(153,178,209,.55)',1.1);
    }
    if(breath>0){glow(ctx,86,10,80*breath,`rgba(255,194,107,${.3*breath})`);}
    ctx.restore();
    // Chest detail and saddle, deliberately over torso for visible contact
    path(ctx,[[-38,-44],[-12,-55],[25,-47],[32,-31],[-48,-28]],'#6b513e','#b99a6d',2);
    line(ctx,[[-24,-39],[-30,41]],'#c6a77b',4);line(ctx,[[15,-39],[24,36]],'#c6a77b',4);
    line(ctx,[[-30,-48],[20,-44]],'#e4c895',1.8);
    for(let i=0;i<5;i++)ellipse(ctx,-25+i*11,-43,1.8,1.8,'#f6dca0');
    ctx.restore();
  }
  function knight(ctx,x,y,s,{walk=0,walking=false,sitting=false,face=1}={}){
    ctx.save();ctx.translate(x,y);ctx.scale(s*face,s);
    const stride=walking?Math.sin(walk*TAU)*.56:0;
    // Animated burgundy cape, more movement in flight than while walking.
    const capeWave=Math.sin(walk*.8)* (sitting?5:1.8);
    path(ctx,[[-10,-67],[-27,-49],[-35+capeWave,-7],[-12+capeWave*.6,-14],[6,-46]],'#4a304b','#b88999',1.5);
    line(ctx,[[-19,-50],[-23+capeWave*.6,-16]],'rgba(228,169,181,.5)',1.3);
    // legs pivot from hips, both foot contacts visually aligned with floor
    ctx.save();ctx.translate(-6,-31);ctx.rotate(sitting?-1.06:stride);
    path(ctx,[[-7,0],[6,0],[8,30],[13,33],[-5,34],[-10,28]],'#8996ac','#d6d8dc',1.2);ctx.restore();
    ctx.save();ctx.translate(7,-31);ctx.rotate(sitting?.83:-stride);
    path(ctx,[[-6,0],[7,0],[9,29],[14,33],[-5,34],[-10,28]],'#6b7c98','#c4cad5',1.2);ctx.restore();
    // torso armor
    path(ctx,[[-16,-69],[15,-70],[19,-34],[-15,-32]],'#a5b2c3','#e2d7bd',2);
    path(ctx,[[-13,-64],[0,-57],[13,-64],[10,-39],[0,-35],[-10,-39]],'#52647d','#d9b878',1.5);
    line(ctx,[[-12,-67],[-10,-43],[0,-38]],'rgba(245,244,238,.78)',1.3);
    ellipse(ctx,0,-48,2.8,2.8,'#f4d28a');
    // arms
    ctx.save();ctx.translate(-17,-64);ctx.rotate(walking?-stride*.55:0);path(ctx,[[-5,0],[5,0],[6,26],[-5,27]],'#8e9bb0','#e2d7bd',1.2);ctx.restore();
    ctx.save();ctx.translate(17,-64);ctx.rotate(walking?stride*.55:(sitting?-.55:0));path(ctx,[[-5,0],[5,0],[6,26],[-5,27]],'#8e9bb0','#e2d7bd',1.2);ctx.restore();
    // helmet and visor facing right
    ellipse(ctx,0,-84,15,17,'#b7bfcb');
    path(ctx,[[-14,-91],[2,-104],[13,-92],[15,-82],[-15,-82]],'#a5b4c9','#e7d6b4',1.3);
    path(ctx,[[1,-87],[16,-86],[17,-79],[0,-79]],'#17243b','#d8cba8',1);
    path(ctx,[[-5,-103],[1,-115],[7,-103]],'#c4a775');
    ctx.restore();
  }
  function background(ctx,w,h,t,travel,stars){
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#070c22');sky.addColorStop(.55,'#18223e');sky.addColorStop(1,'#413b56');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    glow(ctx,w*.76,h*.22,w*.37,'rgba(106,92,170,.22)');glow(ctx,w*.32,h*.56,w*.4,'rgba(77,104,169,.13)');
    for(const p of stars){const xx=(p.x-(travel*.015*p.depth))%w;star(ctx,(xx+w)%w,p.y,p.r,.45+.5*Math.sin(t*.6+p.phase)**2);}
    // moon
    glow(ctx,w*.78,h*.22,w*.16,'rgba(211,218,255,.12)');ellipse(ctx,w*.78,h*.22,w*.052,w*.052,'#cbd3e4');
    ellipse(ctx,w*.795,h*.209,w*.052,w*.052,'#111a34');
    // Slowly drifting cloud bands add depth without external assets.
    ctx.save();ctx.globalAlpha=.13;
    for(let i=0;i<7;i++){
      const cx=((i*277+t*(4+i%3)*3)%(w+420))-210;
      const cy=h*(.16+(i%4)*.115);
      ellipse(ctx,cx,cy,145+(i%3)*35,19+(i%2)*10,'#a6a6c4');
    }
    ctx.restore();
    // far castle silhouette with parallax
    ctx.save();ctx.translate(-travel*.055,0);
    for(let i=-1;i<9;i++){const x=i*200+35,top=h*.45+(i%3)*25;
      ctx.fillStyle='#111b31';ctx.fillRect(x,top,112,h-top);
      path(ctx,[[x-13,top],[x+56,top-58],[x+125,top]],'#141f36');
      // Gothic buttresses and narrow illuminated arrow-slits.
      path(ctx,[[x+7,top+17],[x+20,top+17],[x+20,h],[x-3,h]],'#17223b');
      path(ctx,[[x+89,top+17],[x+102,top+17],[x+115,h],[x+89,h]],'#17223b');
      line(ctx,[[x+7,top+14],[x+56,top-47],[x+105,top+14]],'rgba(145,153,183,.25)',1.5);
      for(let j=0;j<3;j++){ctx.fillStyle='#c6a46d';ctx.globalAlpha=.3;ctx.fillRect(x+20+j*30,top+55,8,18);ctx.globalAlpha=1;}
    }
    ctx.restore();
    // mountains
    path(ctx,[[0,h*.72],[w*.13,h*.54],[w*.24,h*.66],[w*.43,h*.5],[w*.58,h*.66],[w*.74,h*.53],[w,h*.72],[w,h]],'#151e35');
    path(ctx,[[0,h*.81],[w*.17,h*.69],[w*.36,h*.78],[w*.54,h*.64],[w*.72,h*.78],[w*.88,h*.68],[w,h*.79],[w,h]],'#1b243b');
    // Moving distant mist, kept behind the characters.
    ctx.save();ctx.globalAlpha=.07;
    for(let i=0;i<5;i++)ellipse(ctx,((i*390-t*12)%(w+460)+w+460)%(w+460)-170,h*.71+i*14,240,24,'#d0c8dc');
    ctx.restore();
    const fog=ctx.createLinearGradient(0,h*.62,0,h);fog.addColorStop(0,'rgba(140,138,179,0)');fog.addColorStop(1,'rgba(129,129,164,.13)');ctx.fillStyle=fog;ctx.fillRect(0,h*.62,w,h*.38);
  }
  function portal(ctx,x,y,r,t,alpha){
    ctx.save();ctx.globalAlpha=alpha;
    const pulse=1+.035*Math.sin(t*2.4);
    glow(ctx,x,y,r*2.55,`rgba(249,182,90,${.29*alpha})`);
    glow(ctx,x,y,r*1.55,`rgba(139,112,248,${.23*alpha})`);
    ctx.translate(x,y);ctx.scale(.78*pulse,1.13*pulse);
    // The vortex is drawn first, behind the decorative metalwork.
    const vortex=ctx.createRadialGradient(0,0,4,0,0,r*.93);
    vortex.addColorStop(0,'#d7c8f6');vortex.addColorStop(.28,'#8e83d2');
    vortex.addColorStop(.66,'#39376f');vortex.addColorStop(1,'#11152d');
    ctx.beginPath();ctx.arc(0,0,r*.91,0,TAU);ctx.fillStyle=vortex;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,r*.88,0,TAU);ctx.clip();
    for(let i=0;i<16;i++){
      const a=i*TAU/16+t*(i%2?-.18:.22),rr=r*(.13+.042*i);
      ctx.beginPath();ctx.arc(0,0,rr,a,a+1.65);
      ctx.strokeStyle=i%2?'rgba(240,194,134,.30)':'rgba(198,201,255,.38)';
      ctx.lineWidth=2+i%3;ctx.stroke();
    }
    for(let i=0;i<36;i++){
      const a=i*2.39996+t*.16,rr=r*(.1+.7*((i*13%37)/37));
      ellipse(ctx,Math.cos(a)*rr,Math.sin(a)*rr,1.2+(i%3)*.6,1.2+(i%3)*.6,'#f6e0b7');
    }
    ctx.restore();
    // Carved concentric gold rings and violet enamel.
    for(let k=0;k<5;k++){
      ctx.beginPath();ctx.arc(0,0,r*(1.13-k*.062),0,TAU);
      ctx.strokeStyle=['#6c513b','#f4d99e','#9878a7','#d9ad68','#f6e3bb'][k];
      ctx.lineWidth=[10,4,5,3,2][k];ctx.shadowColor='#ffcc78';ctx.shadowBlur=k===1?16:0;ctx.stroke();
    }
    ctx.shadowBlur=0;
    // Arcane runes: individually drawn line glyphs, no font or assets required.
    for(let i=0;i<24;i++){
      const a=i*TAU/24+t*.025;
      ctx.save();ctx.rotate(a);ctx.translate(r*1.07,0);ctx.rotate(Math.PI/2);
      ctx.strokeStyle=i%3===0?'#fff0c4':'#d7b57e';ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(0,5);ctx.lineTo(4,-5);
      if(i%2===0){ctx.moveTo(-4,0);ctx.lineTo(4,0);}else{ctx.moveTo(0,-5);ctx.lineTo(0,7);}
      ctx.stroke();ctx.restore();
    }
    for(let i=0;i<30;i++){
      const a=i*TAU/30+t*.18,rr=r*(1.25+.08*Math.sin(t*1.4+i));
      ellipse(ctx,Math.cos(a)*rr,Math.sin(a)*rr,1.5+i%3,1.5+i%3,'#ffdf9c');
    }
    ctx.restore();
  }
  function title(ctx,w,h,t,scene){const names=[['THE GUARDIAN DESCENDS','The Citadel answers the final seal.'],['THE DRAGON’S ALLEGIANCE','A guardian bows before the Royal Knight.'],['A ROYAL ALLIANCE','Trust is forged beneath the stars.'],['RISE, GUARDIAN','Two destinies become one.'],['BEYOND THE CELESTIAL GATE','Aurilia remembers its heroes.']];const item=names[scene];const fade=ease(Math.min(t%5,1))*ease(Math.min((28-t),1));ctx.save();ctx.globalAlpha=fade;ctx.textAlign='center';ctx.shadowColor='#050915';ctx.shadowBlur=14;ctx.fillStyle='#eed4a1';ctx.font='600 15px Georgia,serif';ctx.fillText(item[0],w/2,h-82);ctx.fillStyle='#e2e4f2';ctx.font='16px Georgia,serif';ctx.fillText(item[1],w/2,h-51);ctx.restore();}
  function render(ctx,w,h,t,stars){
    const scene=t<5?0:t<10?1:t<15?2:t<20?3:4;
    const flight=ease((t-14.3)/2.6),travel=flight*Math.max(0,t-14)*180;
    background(ctx,w,h,t,travel,stars);
    // The gate is hidden until the dragon has been flying for several seconds.
    const gateX=w*.24,gateY=h*.36;
    const gateReveal=ease((t-19.2)/2.3);
    if(gateReveal>0) portal(ctx,gateX,gateY,118,t,gateReveal);
    ctx.save();
    // platform is not visible after launch
    const groundAlpha=1-ease((t-14.4)/2.2);ctx.globalAlpha=groundAlpha;
    path(ctx,[[0,h*.77],[w,h*.77],[w,h],[0,h]],'#252c40');
    line(ctx,[[0,h*.77],[w,h*.77]],'#9c866a',3);
    for(let i=0;i<13;i++){const x=i*112;line(ctx,[[x,h*.77],[x-35,h]],'rgba(165,148,129,.2)',1.4);}
    for(let i=0;i<5;i++)line(ctx,[[0,h*(.8+i*.045)],[w,h*(.8+i*.045)]],'rgba(151,146,164,.15)',1);
    ctx.restore();
    // First the dragon bows to the knight; later both travel LEFT into the gate.
    const approach=ease(t/4.2);
    const bow=ease((t-4.4)/2.3)*(1-ease((t-10.2)/2.4));
    const launch=ease((t-14.3)/2.6);
    const towardGate=ease((t-19.7)/6.1);
    const entering=ease((t-24.0)/2.6);
    const dx=mix(mix(w*.94,w*.65,approach),gateX+45,towardGate)
             +Math.sin(t*1.2)*launch*(1-entering)*4;
    const dy=mix(h*.67,h*.39,launch);
    const ds=mix(.68,.9,approach)*(1-.94*entering);
    const wing=t<13?Math.sin(t*.7):t*5.3;
    // Knight approaches facing RIGHT, then faces LEFT on the saddle.
    const walking=t>=4.5&&t<9.1;
    const kp=ease((t-4.5)/4.6);
    const kx=mix(w*.22,w*.47,kp),ky=h*.77;
    const mount=ease((t-10.1)/3.0);
    const riderX=dx+22*ds,riderY=dy-48*ds;
    const knightX=mix(kx,riderX,mount),knightY=mix(ky,riderY,mount);
    // Both characters disappear together inside the gate, not offscreen.
    const vanish=1-ease((t-26.1)/.5);
    ctx.save();ctx.globalAlpha=vanish;
    dragon(ctx,dx,dy,ds,{bow,wing,flight:launch>.05,breath:ease((t-3)/1)*(1-ease((t-5)/1))});
    ctx.save();ctx.globalAlpha=groundAlpha*.28;
    ellipse(ctx,dx,h*.77+5,125,13,'#040816');ctx.restore();
    knight(ctx,knightX,knightY,mix(1.13,.72*ds,mount),{
      walk:(t-4.5)*1.35,walking,sitting:mount>.4,
      face:mount>.8?-1:1
    });
    ctx.restore();
    // A foreground ring makes it clear they pass THROUGH the portal.
    if(gateReveal>0){
      ctx.save();ctx.globalAlpha=gateReveal;
      ctx.beginPath();ctx.ellipse(gateX,gateY,118*.78,118*1.13,0,-Math.PI*.52,Math.PI*.52);
      ctx.strokeStyle='#ffe1a0';ctx.shadowColor='#e9a95f';ctx.shadowBlur=24;
      ctx.lineWidth=10;ctx.stroke();ctx.restore();
    }
    // luminous flight particles, deterministic (no flicker)
    if(t>14){for(let i=0;i<38;i++){const a=i*2.3999;const phase=(t*130+i*83)%w;const px=(dx-70-phase+w*2)%(w*1.4)-w*.2;const py=dy+Math.sin(a)*55+Math.sin(t+i)*8;ctx.save();ctx.globalAlpha=.15+.5*(i%5)/5;ellipse(ctx,px,py,1.2+i%3,1.2+i%3,'#f9d9a3');ctx.restore();}}
    // The portal illuminates nearby air only once revealed.
    if(gateReveal>0){
      ctx.save();ctx.globalAlpha=gateReveal*.26;
      glow(ctx,gateX,gateY,270,'rgba(250,193,117,.55)');ctx.restore();
    }
    if(t>26.3){ctx.fillStyle=`rgba(255,237,204,${ease((t-26.3)/1.7)})`;ctx.fillRect(0,0,w,h);}
    title(ctx,w,h,t,scene);
    // cinematic letterbox
    ctx.fillStyle='#070a14';ctx.fillRect(0,0,w,30);ctx.fillRect(0,h-27,w,27);
    // vignette
    const vignette=ctx.createRadialGradient(w/2,h/2,w*.16,w/2,h/2,w*.77);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.47)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function start(){
    if(current)return current.promise;
    const host=document.getElementById('world-frame')||document.body;
    const oldPosition=host.style.position;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    const layer=document.createElement('div');layer.setAttribute('aria-label','Aurilia cinematic');
    layer.style.cssText='position:absolute;inset:0;z-index:9999;background:#080c1d;overflow:hidden;isolation:isolate;';
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.style.cssText='width:100%;height:100%;object-fit:contain;display:block;background:#080c1d;';layer.appendChild(canvas);
    const skip=document.createElement('button');skip.type='button';skip.textContent='SKIP CINEMATIC →';skip.style.cssText='position:absolute;right:20px;top:17px;z-index:5;background:rgba(8,12,26,.8);color:#ead3a3;border:1px solid #b89b6a;border-radius:4px;padding:10px 15px;cursor:pointer;letter-spacing:1.3px;font:12px Georgia,serif;';layer.appendChild(skip);
    host.appendChild(layer);
    const ctx=canvas.getContext('2d');if(!ctx){layer.remove();host.style.position=oldPosition;return Promise.resolve();}
    const stars=Array.from({length:100},(_,i)=>({x:((i*7879+123)%1280),y:((i*3391+81)%500),r:.5+(i%4)*.37,phase:i*1.7,depth:1+i%4}));
    let raf=0,done=false,last=0,time=0,resolvePromise;
    const promise=new Promise(resolve=>resolvePromise=resolve);
    function finish(){if(done)return;done=true;cancelAnimationFrame(raf);skip.removeEventListener('click',finish);layer.remove();host.style.position=oldPosition;current=null;resolvePromise();}
    function tick(now){if(done)return;if(!last)last=now;time+=Math.min((now-last)/1000,.05);last=now;render(ctx,1280,720,time,stars);if(time>=DURATION){finish();return;}raf=requestAnimationFrame(tick);}
    skip.addEventListener('click',finish);current={promise,stop:finish};raf=requestAnimationFrame(tick);return promise;
  }
  window.AuriliaCinematic={start,stop:()=>current?.stop()};
})();
