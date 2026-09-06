(() => {
'use strict';

const $ = s => document.querySelector(s);
const canvas = document.createElement('canvas');
document.body.prepend(canvas);

let gl = canvas.getContext('webgl', {antialias:true}) || canvas.getContext('experimental-webgl');
if (!gl) {
  $('#loading').classList.add('hidden');
  $('#error').classList.remove('hidden');
  $('#errtext').textContent = 'WebGL is unavailable in this browser/device. Try the latest Chrome or enable hardware acceleration.';
  return;
}

const loading = $('#loading'), bar = $('#bar'), loadmsg = $('#loadmsg');
let progress=0;
function loadStep(text, p){ loadmsg.textContent=text; progress=p; bar.style.width=p+'%'; }

const VS = `
attribute vec3 aPos;
attribute vec3 aNormal;
uniform mat4 uMVP;
uniform mat4 uModel;
uniform vec3 uColor;
uniform float uLight;
varying vec3 vColor;
void main(){
  vec3 n=normalize(mat3(uModel)*aNormal);
  float l=max(dot(n,normalize(vec3(-.4,1.0,.25))),0.0);
  vColor=uColor*(.35+l*.75)*uLight;
  gl_Position=uMVP*vec4(aPos,1.0);
}`;
const FS = `
precision mediump float;
varying vec3 vColor;
void main(){ gl_FragColor=vec4(vColor,1.0); }`;

function shader(type, src){
  const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
let program;
try{
  program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,VS)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
}catch(e){
  loading.classList.add('hidden'); $('#error').classList.remove('hidden'); $('#errtext').textContent='WebGL shader setup failed: '+e.message; return;
}
gl.useProgram(program);
const aPos=gl.getAttribLocation(program,'aPos'),aNormal=gl.getAttribLocation(program,'aNormal'),uMVP=gl.getUniformLocation(program,'uMVP'),uModel=gl.getUniformLocation(program,'uModel'),uColor=gl.getUniformLocation(program,'uColor'),uLight=gl.getUniformLocation(program,'uLight');

function meshData(vertices, normals){
  const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const nb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,nb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
  return {vb,nb,count:vertices.length/3};
}
function cube(){
  const v=[],n=[];
  const faces=[
    [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[0,0,1]],
    [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
    [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1],[0,1,0]],
    [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]],
    [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]],
    [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]]
  ];
  for(const f of faces){
    const q=[f[0],f[1],f[2],f[0],f[2],f[3]];
    for(const p of q){v.push(...p);n.push(...f[4])}
  }
  return meshData(v,n);
}
const cubeMesh=cube();

const mat4={
  ident(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},
  mul(a,b){let o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
  translate(x,y,z){let m=this.ident();m[12]=x;m[13]=y;m[14]=z;return m},
  scale(x,y,z){let m=this.ident();m[0]=x;m[5]=y;m[10]=z;return m},
  rotY(a){let c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]},
  perspective(fovy,asp,n,f){let q=1/Math.tan(fovy/2),nf=1/(n-f);return [q/asp,0,0,0,0,q,0,0,0,0,(f+n)*nf,-1,0,0,(2*f*n)*nf,0]},
  lookAt(ex,ey,ez,cx,cy,cz){let zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=zy*0-zz*1,xy=zz*0-zx*0,xz=zx*1-zy*0;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return [xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*ex+xy*ey+xz*ez),-(yx*ex+yy*ey+yz*ez),-(zx*ex+zy*ey+zz*ez),1]}
};

const rand=(()=>{let s=(Date.now()^0x9e3779b9)|0;return()=>{s=(Math.imul(s^1664525,1013904223))|0;return (s>>>0)/4294967296}})();

const objects=[];
function addObj(type,x,y,z,sx,sy,sz,color){
  objects.push({type,x,y,z,sx,sy,sz,color});
}
function makeForest(){
  for(let i=0;i<260;i++){
    let x=(rand()-.5)*180,z=(rand()-.5)*180;if(Math.hypot(x,z)<12){i--;continue}
    const h=2.5+rand()*4.5;
    addObj('tree',x,h/2,z,.7+rand()*.5,h,.7+rand()*.5,[.08+.04*rand(),.28+.1*rand(),.12+.06*rand()]);
    addObj('leaf',x,h+1,z,1.8+rand(),2+rand()*1.2,1.8+rand(),[.06,.30+.15*rand(),.10]);
  }
  for(let i=0;i<100;i++){
    let x=(rand()-.5)*175,z=(rand()-.5)*175;
    addObj('rock',x,.35,z,.5+rand()*.7,.5+rand()*.6,.5+rand()*.7,[.25+.15*rand(),.27+.15*rand(),.28+.15*rand()]);
  }
  for(let i=0;i<35;i++){
    let x=(rand()-.5)*150,z=(rand()-.5)*150;
    addObj('resource',x,.45,z,.35,.7,.35,[.45+.2*rand(),.25+.2*rand(),.08]);
  }
}
makeForest();

const player={x:0,y:0,z:8,yaw:0,hp:100,hunger:100,thirst:100,stamina:100,wood:0,stone:0,berries:0,water:0,day:1};
const saved=JSON.parse(localStorage.getItem('forgottenForestRawGL')||'null'); if(saved) Object.assign(player,saved);

const enemies=[];
for(let i=0;i<10;i++) enemies.push({x:(rand()-.5)*120,z:(rand()-.5)*120,hp:3,spd:1.1+rand()*1.2});

const keys={}; let cameraYaw=0,drag=false,lastX=0,gameTime=0,last=performance.now(),messageTimer=0,interactionCooldown=0;

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')interact()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX});
addEventListener('pointerup',()=>drag=false);
addEventListener('pointermove',e=>{if(drag){cameraYaw-=(e.clientX-lastX)*.006;lastX=e.clientX}});

document.querySelectorAll('[data-key]').forEach(b=>{
  const k=b.dataset.key;
  b.onpointerdown=()=>keys[k]=true;
  b.onpointerup=()=>keys[k]=false;
  b.onpointerleave=()=>keys[k]=false;
});
$('#lookL').onpointerdown=()=>cameraYaw+=.2;
$('#lookR').onpointerdown=()=>cameraYaw-=.2;
$('#action').onclick=interact;
$('#share').onclick=async()=>{
  const text=`I survived Day ${player.day} in The Forgotten Forest. Can you survive longer?`;
  if(navigator.share){try{await navigator.share({title:'The Forgotten Forest',text,url:location.href})}catch(e){}}
  else {try{await navigator.clipboard.writeText(text+' '+location.href);say('SHARE TEXT COPIED')}catch(e){say('SHARE IS NOT AVAILABLE')}}
};

function say(t){const e=$('#message');e.textContent=t;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}

function interact(){
  if(interactionCooldown>0)return;interactionCooldown=.3;
  let best=null,bd=3;
  for(const o of objects){if(o.type==='resource'){let d=Math.hypot(o.x-player.x,o.z-player.z);if(d<bd){best=o;bd=d}}}
  if(best){best.type='collected';player.wood++;say('+1 WOOD');save();return}
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i],d=Math.hypot(e.x-player.x,e.z-player.z);
    if(d<2.5){e.hp--;if(e.hp<=0){enemies.splice(i,1);say('CREATURE DEFEATED')}else{player.stamina=Math.max(0,player.stamina-5);say('HIT!')}return}
  }
  if(Math.hypot(player.x-6,player.z-3)<4){player.hp=Math.min(100,player.hp+10);player.hunger=Math.min(100,player.hunger+20);player.thirst=Math.min(100,player.thirst+25);say('CAMPFIRE RESTORED YOU')}
}

function save(){localStorage.setItem('forgottenForestRawGL',JSON.stringify(player))}
function updateUI(){
  $('#hp').textContent=Math.round(player.hp);$('#hunger').textContent=Math.round(player.hunger);$('#thirst').textContent=Math.round(player.thirst);$('#stamina').textContent=Math.round(player.stamina);
  $('#wood').textContent=player.wood;$('#stone').textContent=player.stone;$('#berries').textContent=player.berries;$('#water').textContent=player.water;$('#day').textContent=player.day;
  $('#objective').textContent=player.day<4?'Explore, gather supplies and survive the night.':player.day<8?'Go deeper into the forest and find the forgotten ruins.':'The forest remembers. Keep exploring.';
}

function resize(){
  const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*d);canvas.height=Math.floor(innerHeight*d);gl.viewport(0,0,canvas.width,canvas.height)
}
addEventListener('resize',resize);resize();

function render(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;gameTime+=dt;interactionCooldown=Math.max(0,interactionCooldown-dt);

  let f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);
  let r=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  const len=Math.hypot(f,r)||1;f/=len;r/=len;
  const sprint=keys.shift&&player.stamina>1,speed=sprint?6.5:3.8;
  player.stamina=Math.max(0,Math.min(100,player.stamina+(sprint?-14:10)*dt));
  const dx=(r*Math.cos(cameraYaw)+f*Math.sin(cameraYaw))*speed*dt;
  const dz=(f*Math.cos(cameraYaw)-r*Math.sin(cameraYaw))*speed*dt;
  player.x=Math.max(-104,Math.min(104,player.x+dx));player.z=Math.max(-104,Math.min(104,player.z+dz));
  if(f||r)player.yaw=Math.atan2(dx,dz);

  player.hunger=Math.max(0,player.hunger-.42*dt);player.thirst=Math.max(0,player.thirst-.62*dt);
  if(player.hunger<12||player.thirst<12)player.hp=Math.max(0,player.hp-1.4*dt);

  for(const e of enemies){
    const ex=player.x-e.x,ez=player.z-e.z,d=Math.hypot(ex,ez);
    if(d<18&&d>.8){e.x+=ex/d*e.spd*dt;e.z+=ez/d*e.spd*dt}
    if(d<1.25)player.hp=Math.max(0,player.hp-7*dt);
  }
  if(player.hp<=0){player.hp=70;player.hunger=55;player.thirst=55;player.x=0;player.z=8;say('YOU COLLAPSED — BACK AT CAMP')}

  const nd=1+Math.floor(gameTime/70);if(nd>player.day){player.day=nd;save();say('DAY '+nd)}

  const day=Math.sin((gameTime%70)/70*Math.PI*2);
  const light=.22+Math.max(0,day)*.9;
  gl.enable(gl.DEPTH_TEST);gl.clearColor(.025+.12*Math.max(day,0),.06+.18*Math.max(day,0),.04+.14*Math.max(day,0),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  const aspect=canvas.width/canvas.height;
  const P=mat4.perspective(1.05,aspect,.1,500);
  const camDist=7.5,camH=4.2;
  const cx=player.x-Math.sin(cameraYaw)*camDist,cz=player.z-Math.cos(cameraYaw)*camDist,cy=camH;
  const V=mat4.lookAt(cx,cy,cz,player.x,1.2,player.z);
  const VP=mat4.mul(P,V);

  drawGround(VP,light);
  for(const o of objects)if(o.type!=='collected')drawObject(o,VP,light);
  for(const e of enemies)drawObject({type:'enemy',x:e.x,y:.65,z:e.z,sx:.75,sy:1.2,sz:.75,color:[.32,.07,.08]},VP,light);
  drawObject({type:'player',x:player.x,y:1,z:player.z,sx:.55,sy:1.8,sz:.55,color:[.72,.88,.80]},VP,light);
  drawObject({type:'camp',x:6,y:.35,z:3,sx:1,sy:.7,sz:1,color:[.8,.28,.06]},VP,light);

  updateUI();save();
  requestAnimationFrame(render);
}

function drawGround(VP,light){
  const M=mat4.mul(mat4.translate(0,-.15,0),mat4.scale(110,.15,110));
  drawMesh(cubeMesh,VP,M,[.07,.20,.10],light);
}
function drawObject(o,VP,light){
  let base=mat4.mul(mat4.translate(o.x,o.y,o.z),mat4.scale(o.sx,o.sy,o.sz));
  if(o.type==='tree'||o.type==='leaf'){
    drawMesh(cubeMesh,VP,base,o.type==='tree'?[.28,.16,.07]:o.color,light);
    if(o.type==='tree')drawMesh(cubeMesh,VP,mat4.mul(mat4.translate(o.x,o.y+o.sy*.9,o.z),mat4.scale(o.sx*2.1,o.sy*.35,o.sz*2.1)),o.color,light);
  }else drawMesh(cubeMesh,VP,base,o.color,light);
}
function drawMesh(mesh,VP,M,color,light){
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vb);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,0,0);
  gl.uniformMatrix4fv(uMVP,false,new Float32Array(mat4.mul(VP,M)));gl.uniformMatrix4fv(uModel,false,new Float32Array(M));
  gl.uniform3fv(uColor,new Float32Array(color));gl.uniform1f(uLight,light);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}

loadStep('Creating WebGL renderer',30);
setTimeout(()=>loadStep('Generating forest',65),120);
setTimeout(()=>loadStep('Preparing survival systems',85),260);
setTimeout(()=>{loadStep('Ready',100);setTimeout(()=>loading.classList.add('hidden'),350);requestAnimationFrame(render)},480);

setTimeout(()=>{
  if(!loading.classList.contains('hidden')){
    loading.classList.add('hidden');$('#error').classList.remove('hidden');$('#errtext').textContent='The game took too long to start. Reload the page and try again.';
  }
},6000);

})();
