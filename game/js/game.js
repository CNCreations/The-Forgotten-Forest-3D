
(() => {
"use strict";

const canvas=document.getElementById("game");
const gl=canvas.getContext("webgl",{antialias:true,alpha:false})||canvas.getContext("experimental-webgl");
const loading=document.getElementById("loading"), fatal=document.getElementById("fatal");
const loadBar=document.getElementById("load-bar"), loadText=document.getElementById("load-text");
if(!gl){loading.classList.add("hide");fatal.classList.remove("hide");document.getElementById("fatal-text").textContent="This browser/device does not provide WebGL. Try the latest Chrome.";return;}

function progress(p,t){loadBar.style.width=p+"%";loadText.textContent=t;}

const VS=`attribute vec3 aP;attribute vec3 aN;uniform mat4 uMVP,uM;uniform vec3 uC;uniform float uL;varying vec3 v;void main(){vec3 n=normalize(mat3(uM)*aN);float d=max(dot(n,normalize(vec3(-.5,1,.25))),0.0);v=uC*(.34+d*.72)*uL;gl_Position=uMVP*vec4(aP,1.0);}`;
const FS=`precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.0);}`;
function makeShader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let prog;
try{prog=gl.createProgram();gl.attachShader(prog,makeShader(gl.VERTEX_SHADER,VS));gl.attachShader(prog,makeShader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));}catch(e){loading.classList.add("hide");fatal.classList.remove("hide");document.getElementById("fatal-text").textContent="3D shader initialization failed: "+e.message;return;}
gl.useProgram(prog);
const aP=gl.getAttribLocation(prog,"aP"),aN=gl.getAttribLocation(prog,"aN"),uMVP=gl.getUniformLocation(prog,"uMVP"),uM=gl.getUniformLocation(prog,"uM"),uC=gl.getUniformLocation(prog,"uC"),uL=gl.getUniformLocation(prog,"uL");

const cubeV=[
-1,-1,1,1,-1,1,1,1,1,-1,-1,1,1,1,1,-1,1,1,
1,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,1,-1,
-1,1,1,1,1,1,1,1,-1,-1,1,1,1,1,-1,-1,1,-1,
-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,-1,-1,1,
1,-1,1,1,-1,-1,1,1,-1,1,-1,1,1,1,-1,1,1,1,
-1,-1,-1,-1,-1,1,-1,1,1,-1,-1,-1,-1,1,1,-1,1,-1];
const cubeN=[];
[[0,0,1],[0,0,-1],[0,1,0],[0,-1,0],[1,0,0],[-1,0,0]].forEach(n=>{for(let i=0;i<6;i++)cubeN.push(...n)});
function buffer(arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);return b;}
const cube={vb:buffer(cubeV),nb:buffer(cubeN),count:36};

function matI(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function mm(a,b){const o=Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function tr(x,y,z){const m=matI();m[12]=x;m[13]=y;m[14]=z;return m}
function sc(x,y,z){const m=matI();m[0]=x;m[5]=y;m[10]=z;return m}
function ry(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]}
function perspective(f,a,n,f2){const q=1/Math.tan(f/2),nf=1/(n-f2);return[q/a,0,0,0,0,q,0,0,0,0,(f2+n)*nf,-1,0,0,2*f2*n*nf,0]}
function look(ex,ey,ez,cx,cy,cz){let zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=-zz,xz=zx; l=Math.hypot(xx,xz)||1;xx/=l;xz/=l;let yx=zy*xz,yy=zz*xx-yz0(),yz=-zy*xx;function yz0(){return 0} return[xx,yx,zx,0,0,yy,zy,0,xz,yz,zz,0,-(xx*ex+xz*ez),-(yy*ey+zy*ez),-(zx*ex+zz*ez),1]}
// More stable camera lookAt (explicit basis)
function cameraMatrix(ex,ey,ez,cx,cy,cz){
 let zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
 let xx=zz,xy=0,xz=-zx;l=Math.hypot(xx,xz);xx/=l;xz/=l;
 let yx=zy*xz,yy=zz*xx-zx*xz,yz=-zy*xx;
 return[xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*ex+xy*ey+xz*ez),-(yx*ex+yy*ey+yz*ez),-(zx*ex+zy*ey+zz*ez),1];
}
function draw(M,VP,c,light=1){gl.bindBuffer(gl.ARRAY_BUFFER,cube.vb);gl.enableVertexAttribArray(aP);gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,cube.nb);gl.enableVertexAttribArray(aN);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(uMVP,false,new Float32Array(mm(VP,M)));gl.uniformMatrix4fv(uM,false,new Float32Array(M));gl.uniform3fv(uC,new Float32Array(c));gl.uniform1f(uL,light);gl.drawArrays(gl.TRIANGLES,0,36);}
function box(x,y,z,sx,sy,sz,c,VP,rot=0,light=1){let M=mm(tr(x,y,z),mm(ry(rot),sc(sx,sy,sz)));draw(M,VP,c,light)}

let seed=(Date.now()^0x7f4a7c15)|0;
function rnd(){seed=Math.imul(seed^seed>>>16,2246822507);seed=Math.imul(seed^seed>>>13,3266489909);return((seed^seed>>>16)>>>0)/4294967296}

const world=[],resources=[],enemies=[];
function add(type,x,z,sx,sy,sz,c){world.push({type,x,z,sx,sy,sz,c,rot:rnd()*6.28})}
progress(20,"Building terrain…");
for(let i=0;i<250;i++){let x=(rnd()-.5)*190,z=(rnd()-.5)*190;if(Math.hypot(x,z)<13){i--;continue}let s=.7+rnd()*.5,h=2.8+rnd()*4;add("trunk",x,z,.35*s,h/2,.35*s,[.27,.15,.07]);add("crown",x,z,1.45*s,1.0*s,1.45*s,[.055,.25+.12*rnd(),.08]);}
progress(45,"Placing rocks and supplies…");
for(let i=0;i<120;i++){let x=(rnd()-.5)*180,z=(rnd()-.5)*180;world.push({type:"rock",x,z,sx:.35+rnd()*.55,sy:.25+rnd()*.45,sz:.35+rnd()*.55,c:[.25+.12*rnd(),.28+.12*rnd(),.29+.12*rnd()],rot:rnd()*6.28});}
for(let i=0;i<45;i++){let x=(rnd()-.5)*150,z=(rnd()-.5)*150;resources.push({x,z,type:i%3===0?"stone":"wood",alive:true});}
progress(65,"Preparing wildlife…");
for(let i=0;i<9;i++)enemies.push({x:(rnd()-.5)*120,z:(rnd()-.5)*120,hp:3,spd:1.1+rnd()*1.1,rot:0});
progress(80,"Preparing player and survival systems…");

const saveKey="forgottenForestFinalV1";
const player={x:0,z:8,yaw:0,hp:100,hunger:100,thirst:100,stamina:100,wood:0,stone:0,berries:0,day:1};
try{const s=JSON.parse(localStorage.getItem(saveKey)||"null");if(s)Object.assign(player,s)}catch(e){}

const keys={};let camYaw=0,drag=false,lastPointerX=0,last=performance.now(),time=0,cd=0;
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==="e")interact();});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("pointerdown",e=>{drag=true;lastPointerX=e.clientX});
addEventListener("pointerup",()=>drag=false);
addEventListener("pointermove",e=>{if(drag){camYaw-=(e.clientX-lastPointerX)*.006;lastPointerX=e.clientX}});
document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.onpointerdown=()=>keys[k]=true;b.onpointerup=b.onpointerleave=()=>keys[k]=false});
document.getElementById("look-left").onpointerdown=()=>camYaw+=.22;
document.getElementById("look-right").onpointerdown=()=>camYaw-=.22;
document.getElementById("action").onclick=interact;
document.getElementById("share").onclick=async()=>{const t=`I survived Day ${player.day} in The Forgotten Forest. Can you survive longer?`;if(navigator.share){try{await navigator.share({title:"The Forgotten Forest",text:t,url:location.href})}catch(e){}}else{try{await navigator.clipboard.writeText(t+" "+location.href);toast("SHARE TEXT COPIED")}catch(e){toast("SHARE NOT AVAILABLE")}}};

function toast(t){const e=document.getElementById("toast");e.textContent=t;e.classList.remove("toast-show");void e.offsetWidth;e.classList.add("toast-show")}
function interact(){
 if(cd>0)return;cd=.35;
 let best=null,bd=3;
 for(const r of resources)if(r.alive){const d=Math.hypot(r.x-player.x,r.z-player.z);if(d<bd){best=r;bd=d}}
 if(best){best.alive=false;if(best.type==="wood")player.wood++;else player.stone++;toast("+1 "+best.type.toUpperCase());save();return}
 for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],d=Math.hypot(e.x-player.x,e.z-player.z);if(d<2.7){e.hp--;if(e.hp<=0){enemies.splice(i,1);toast("WILDLIFE DEFEATED")}else{player.hp=Math.max(0,player.hp-2);toast("HIT!");}return}}
 if(Math.hypot(player.x-6,player.z-3)<4){player.hp=Math.min(100,player.hp+15);player.hunger=Math.min(100,player.hunger+22);player.thirst=Math.min(100,player.thirst+28);toast("CAMPFIRE RESTORED YOU");return}
 toast("NOTHING TO INTERACT WITH");
}
function save(){try{localStorage.setItem(saveKey,JSON.stringify(player))}catch(e){}}
function ui(){
 document.getElementById("hp").textContent=Math.round(player.hp);document.getElementById("food").textContent=Math.round(player.hunger);document.getElementById("waterstat").textContent=Math.round(player.thirst);document.getElementById("stamina").textContent=Math.round(player.stamina);
 document.getElementById("wood").textContent=player.wood;document.getElementById("stone").textContent=player.stone;document.getElementById("berries").textContent=player.berries;document.getElementById("day").textContent=player.day;
 document.getElementById("objective-text").textContent=player.day<3?"Gather wood and explore the forest.":player.day<6?"Survive the night and push deeper into the forest.":"The forgotten ruins are somewhere beyond the trees.";
}
function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;gl.viewport(0,0,canvas.width,canvas.height)}addEventListener("resize",resize);resize();

function drawPlayer(VP){
 const x=player.x,z=player.z,r=player.yaw;
 // legs
 box(x-.22,z*0+0.48,z,.20,.55,.20,[.12,.20,.18],VP,r);
 box(x+.22,.48,z,.20,.55,.20,[.12,.20,.18],VP,r);
 // torso, head, shoulders
 box(x,1.35,z,.48,.72,.30,[.18,.48,.35],VP,r);
 box(x,2.28,z,.32,.32,.32,[.78,.52,.36],VP,r);
 box(x-.64,1.35,z,.16,.58,.16,[.18,.42,.30],VP,r);
 box(x+.64,1.35,z,.16,.58,.16,[.18,.42,.30],VP,r);
 // backpack
 box(x,1.35,z-.36,.34,.52,.12,[.10,.16,.12],VP,r);
}
function drawEnemy(e,VP,light){
 box(e.x,.58,e.z,.48,.58,.40,[.36,.08,.09],VP,e.rot,light);
 box(e.x,1.25,e.z,.34,.34,.30,[.28,.045,.05],VP,e.rot,light);
 box(e.x-.22,1.45,e.z+.20,.07,.07,.07,[1,.55,.08],VP,e.rot,light);
 box(e.x+.22,1.45,e.z+.20,.07,.07,.07,[1,.55,.08],VP,e.rot,light);
}
function render(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;cd=Math.max(0,cd-dt);
 let f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),r=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
 const l=Math.hypot(f,r)||1;f/=l;r/=l;const sprint=keys.shift&&player.stamina>1,spd=sprint?6.3:3.7;
 player.stamina=Math.max(0,Math.min(100,player.stamina+(sprint?-15:10)*dt));
 const dx=(r*Math.cos(camYaw)+f*Math.sin(camYaw))*spd*dt,dz=(f*Math.cos(camYaw)-r*Math.sin(camYaw))*spd*dt;
 player.x=Math.max(-104,Math.min(104,player.x+dx));player.z=Math.max(-104,Math.min(104,player.z+dz));
 if(f||r)player.yaw=Math.atan2(dx,dz);
 player.hunger=Math.max(0,player.hunger-.45*dt);player.thirst=Math.max(0,player.thirst-.65*dt);
 if(player.hunger<12||player.thirst<12)player.hp=Math.max(0,player.hp-1.5*dt);
 for(const e of enemies){const dxp=player.x-e.x,dzp=player.z-e.z,d=Math.hypot(dxp,dzp);if(d<19&&d>1)e.x+=dxp/d*e.spd*dt,e.z+=dzp/d*e.spd*dt;if(d<1.2)player.hp=Math.max(0,player.hp-7*dt);}
 if(player.hp<=0){player.hp=70;player.hunger=55;player.thirst=55;player.x=0;player.z=8;toast("YOU COLLAPSED — BACK AT CAMP");}
 const nd=1+Math.floor(time/70);if(nd>player.day){player.day=nd;save();toast("DAY "+nd)}
 const sun=Math.sin((time%70)/70*Math.PI*2),light=.22+Math.max(0,sun)*.9;
 gl.enable(gl.DEPTH_TEST);gl.clearColor(.015+.07*Math.max(sun,0),.035+.10*Math.max(sun,0),.025+.075*Math.max(sun,0),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const VP=mm(perspective(1.05,canvas.width/canvas.height,.1,500),cameraMatrix(player.x-Math.sin(camYaw)*8,4.8,player.z-Math.cos(camYaw)*8,player.x,1.2,player.z));
 box(0,-.2,0,110,.18,110,[.045,.16,.07],VP,0,light);
 // path around camp
 box(0,-.01,10,3,.02,20,[.15,.12,.08],VP,0,light);
 for(const o of world){
   if(o.type==="trunk")box(o.x,o.sy,o.z,o.sx,o.sy,o.sz,o.c,VP,o.rot,light);
   else if(o.type==="crown")box(o.x,4.0,o.z,o.sx,o.sy,o.sz,o.c,VP,o.rot,light);
   else box(o.x,o.sy,o.z,o.sx,o.sy,o.sz,o.c,VP,o.rot,light);
 }
 for(const r0 of resources)if(r0.alive)box(r0.x,.5,r0.z,.28,.5,.28,r0.type==="wood"?[.58,.32,.12]:[.48,.50,.54],VP,r0.type==="wood"?.2:.7,light);
 // campfire
 box(6,.22,3,1,.22,1,[.25,.10,.035],VP,0,light);box(6,.55,3,.22,.55,.22,[1,.34,.05],VP,0,Math.min(1.5,light+0.5));
 for(const e of enemies)drawEnemy(e,VP,light);
 drawPlayer(VP);
 ui();save();requestAnimationFrame(render);
}
progress(100,"Ready");
setTimeout(()=>{loading.classList.add("hide");requestAnimationFrame(render)},450);
})();
