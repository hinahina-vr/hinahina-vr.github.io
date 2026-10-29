import { Container, MeshPlane, Texture, Rectangle } from './vendor/pixi-hinata.mjs';
import { armPoint, corePoint, rotate, HAND_SCALE, ARM_SCALE, ARM_ATTACH, armAngles, sleevePoint } from './hinata-rig-math.mjs?v=20261029-r11';
import { faceEdge } from './hinata-face-edge.mjs';
import { outfitJoin } from './hinata-outfit-join.mjs';

// All facial features remain painted together with neck and torso. Only the
// neck transition bends; the whole face is a single rigid region of the mesh.
export class HinataRig {
  constructor(sources) {
    this.sources=sources; this.meshes=[];
    this.root=new Container({label:'hinata-skeleton',eventMode:'none'});
    this.root.position.set(400,40); this.root.pivot.set(230,0); this.root.scale.set(1.55);
    this.backLeft=this.hair([0,0,460,1024], [400,60], [165,110], [.42,.75], .2,'back-left');
    this.backRight=this.hair([460,0,460,1024], [60,60], [315,110], [.42,.75], 2.1,'back-right');
    this.outfit=this.mesh(new Texture({source:this.sources[3]}),2,2,'opaque-lower-outfit');
    this.outfit.mesh.position.set(20,450);this.outfit.mesh.scale.set(.34);
    this.left=this.arm(false); this.right=this.arm(true);
    this.expressions=Object.fromEntries(['idle','blink','talk','smile','wink','greeting'].map((name,i)=>[name,this.texture(0,[(i%3)*418,Math.floor(i/3)*627,418,627])]));
    this.core=this.mesh(this.expressions.idle,13,33,'connected-face-neck-body');
    this.core.mesh.filters=[outfitJoin()];
    // The generated atlas cells are not registered: the chin is 15 px higher
    // in row two, and columns two/three are 6/18 px left. Align the painted
    // jaw/cheek contour before selecting the face window.
    const faceOffsets=[[0,0],[-6,0],[-18,0],[1,-15],[-6,-15],[-18,-15]];
    this.faceExpressions=Object.fromEntries(['idle','blink','talk','smile','wink','greeting'].map((name,i)=>[name,this.texture(0,[(i%3)*418+136+faceOffsets[i][0],Math.floor(i/3)*627+202+faceOffsets[i][1],184,110])]));
    this.face=this.mesh(this.faceExpressions.idle,9,9,'connected-expression-window');
    this.face.mesh.filters=[faceEdge()];
    this.frontLeft=this.hair([930,0,280,1024],[180,60],[110,210],[.43,.46],.8,'front-left');
    this.frontRight=this.hair([1210,0,326,1024],[75,60],[345,210],[.43,.46],2.8,'front-right');
    // Arms pass in front of the long side locks. The connected blouse is last,
    // so its puff sleeves cover the shoulder caps at every allowed pose.
    this.root.setChildIndex(this.frontLeft.mesh, 2);
    this.root.setChildIndex(this.frontRight.mesh, 3);
  }
  texture(sheet,rect){return new Texture({source:this.sources[sheet],frame:new Rectangle(...rect)});}
  mesh(texture,nx,ny,label) {
    const mesh=new MeshPlane({texture,verticesX:nx,verticesY:ny,eventMode:'none',label});
    mesh.autoResize=false;
    const item={mesh,base:new Float32Array(mesh.geometry.positions)};
    this.meshes.push(item); this.root.addChild(mesh); return item;
  }
  hair(rect,pin,attach,scale,phase,label) {
    return {...this.mesh(this.texture(2,rect),7,25,label),pin,attach,scale,phase};
  }
  arm(right) {
    return {...this.mesh(this.texture(1,[right?768:0,0,768,1024]),33,97,right?'right-arm-bones':'left-arm-bones'),right,attach:ARM_ATTACH[right?'right':'left'],scale:ARM_SCALE};
  }
  update({time,energy,head,body,bounce,hairLag,expression,wave,talking,happy,lookY}) {
    const t=time;
    this.root.rotation=body;
    this.root.y=40-bounce;
    this.root.scale.set(1.55);
    this.face.mesh.visible=expression!=='idle';
    this.face.mesh.texture=this.faceExpressions[expression];
    const face=this.face.mesh.geometry.positions;
    for(let i=0;i<face.length;i+=2) {
      const p=corePoint(this.face.base[i]+136,this.face.base[i+1]+202,head,lookY*energy);
      face[i]=p[0];face[i+1]=p[1];
    }
    const arms=[this.left,this.right].map(arm=>[arm,armAngles(t,energy,wave,talking,arm.right)]);
    const core=this.core.mesh.geometry.positions;
    for(let i=0;i<core.length;i+=2) {
      const sleeve=sleevePoint(this.core.base[i],this.core.base[i+1],arms[0][1][0],arms[1][1][0]);
      const p=corePoint(...sleeve,head,lookY*energy);
      core[i]=p[0];core[i+1]=p[1];
    }
    // The sleeve and upper arm rotate around the same shoulder pivot.
    for(const [arm,angles]of arms) {
      const buffer=arm.mesh.geometry.positions;
      for(let i=0;i<buffer.length;i+=2) {
        const p=armPoint(arm.base[i],arm.base[i+1],angles,arm.right);
        buffer[i]=arm.attach[0]+p[0]*arm.scale;buffer[i+1]=arm.attach[1]+p[1]*arm.scale;
      }
      arm.angles=angles;
    }
    for(const hair of [this.backLeft,this.backRight,this.frontLeft,this.frontRight]) {
      const buffer=hair.mesh.geometry.positions;
      const front=hair===this.frontLeft||hair===this.frontRight;
      for(let i=0;i<buffer.length;i+=2) {
        const u=Math.max(0,(hair.base[i+1]-hair.pin[1])/(1024-hair.pin[1]));
        const sway=Math.pow(u,1.5)*(Math.sin(t*.65-u*2+hair.phase)*(front?3:6)*energy+hairLag*65);
        const x=hair.attach[0]+(hair.base[i]-hair.pin[0])*hair.scale[0]+sway;
        const y=hair.attach[1]+(hair.base[i+1]-hair.pin[1])*hair.scale[1];
        const r=rotate(x-230,y-330,head);
        buffer[i]=230+r[0];buffer[i+1]=330+r[1]-lookY*energy*3;
      }
      hair.tip=buffer[buffer.length-2];
    }
    for(const item of this.meshes)item.mesh.geometry.getBuffer('aPosition').update();
    return {parts:this.meshes.length,vertices:this.meshes.reduce((n,m)=>n+m.base.length/2,0),
      rightShoulder:this.right.angles[0],rightElbow:this.right.angles[1],rightWrist:this.right.angles[2],
      leftElbow:this.left.angles[1],hairTip:this.backLeft.tip,headAngle:head,handScale:HAND_SCALE};
  }
}
