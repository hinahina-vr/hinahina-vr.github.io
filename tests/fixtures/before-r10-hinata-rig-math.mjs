// Bone-space transforms shared by the renderer and regression tests.
export const smooth = x => { x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
export const rotate = (x,y,a) => [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
export const HAND_SCALE = .82;
export const ARM_SCALE = .40;
export const ARM_ATTACH = { left:[128,360], right:[342,360] };
// Pins measured on the painted poses, not on a straight placeholder arm.
export const ARM_PINS = {
  left: { shoulder:[460,130], elbow:[505,490], wrist:[430,790] },
  right: { shoulder:[210,150], elbow:[330,505], wrist:[545,290] }
};
const unit = v => { const d=Math.hypot(...v); return v.map(n=>n/d); };
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const subtract = (a,b) => a.map((n,i)=>n-b[i]);
export function armAngles(t, energy, wave, talking, right) {
  // The wave elbow is already drawn bent. Move around that pose instead of
  // folding a straight painted forearm through 110 degrees.
  return right
    ? [-.015*energy*Math.sin(t*.9)-wave*.09, .25*(1-wave)-wave*.28+energy*Math.sin(t*.8)*.018, wave*Math.sin(t*7)*.14]
    : [energy*Math.sin(t*.9)*.018, energy*(.025+Math.sin(t*.8)*.015+talking*.06), energy*Math.sin(t*1.4)*.018];
}
export function armPoint(x,y,angles,right=false) {
  const {shoulder:S,elbow:E,wrist:W}=ARM_PINS[right?'right':'left'];
  const [a,b,c]=angles;
  const upperAxis=unit(subtract(E,S)), lowerAxis=unit(subtract(W,E));
  const bisector=unit(upperAxis.map((n,i)=>n+lowerAxis[i]));
  const alongElbow=dot(subtract([x,y],E),bisector)/dot(upperAxis,bisector);
  const elbowWeight=smooth((alongElbow+70)/140);
  const handWeight=smooth((dot(subtract([x,y],W),lowerAxis)+40)/100);
  const handScale=1-(1-HAND_SCALE)*handWeight;
  const p=[W[0]+(x-W[0])*handScale,W[1]+(y-W[1])*handScale];
  const er=rotate(E[0]-S[0],E[1]-S[1],a);
  const wr=rotate(W[0]-E[0],W[1]-E[1],a+b),wrist=[er[0]+wr[0],er[1]+wr[1]];
  const upper=rotate(p[0]-S[0],p[1]-S[1],a);
  const lr=rotate(p[0]-E[0],p[1]-E[1],a+b),lower=[er[0]+lr[0],er[1]+lr[1]];
  const hr=rotate(p[0]-W[0],p[1]-W[1],a+b+c),hand=[wrist[0]+hr[0],wrist[1]+hr[1]];
  return upper.map((n,i)=>(n+(lower[i]-n)*elbowWeight)*(1-handWeight)+hand[i]*handWeight);
}
export function sleevePoint(x,y,leftAngle,rightAngle) {
  const vertical=smooth((y-325)/40)*(1-smooth((y-465)/35));
  const left=vertical*(1-smooth((x-130)/40));
  const right=vertical*smooth((x-300)/45);
  const weight=x<230?left:right, side=x<230?'left':'right';
  const pivot=ARM_ATTACH[side], angle=x<230?leftAngle:rightAngle;
  const sleeveY=pivot[1]+(y-pivot[1])*(y>pivot[1]?.85:1);
  const r=rotate(x-pivot[0],sleeveY-pivot[1],angle);
  return [x+(pivot[0]+r[0]-x)*weight,y+(pivot[1]+r[1]-y)*weight];
}
export function corePoint(x,y,headAngle,lookY=0) {
  const weight=1-smooth((y-330)/95), r=rotate(x-230,y-330,headAngle);
  return [x+(230+r[0]-x)*weight,y+(330+r[1]-y-lookY*3)*weight];
}
