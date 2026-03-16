const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Add depth-based opacity to particles: smaller particles = farther = more transparent
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const breathe=Math.sin(p.age*0.008)")) {
    // Replace alpha calculation with depth-based opacity
    lines[i] = "   const breathe=Math.sin(p.age*0.008)*0.5+0.5;";
    lines[i+1] = "   const depthFactor=Math.min(p.size/6,1);"; // smaller=farther=dimmer
    // Insert particle fade multiplier
    lines.splice(i+2, 0,
      "   const alpha=p.baseAlpha*(0.5+breathe*0.5)*depthFactor*(typeof particleFade!=='undefined'?particleFade:1);"
    );
    // Remove old alpha line if it exists
    for (let j = i+3; j < i+6; j++) {
      if (lines[j] && lines[j].includes("const alpha=p.baseAlpha")) {
        lines.splice(j, 1);
        break;
      }
    }
    console.log('Added depth-based opacity + fade multiplier');
    break;
  }
}

// 2. Add particle fade variable
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("let particlesActive=false;")) {
    lines[i] = "let particlesActive=false;let particleFade=1;";
    console.log('Added particleFade variable');
    break;
  }
}

// 3. In nehan(): fade particles out instead of instant stop
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("// Stop particles, darken everything") && lines[i+1] && lines[i+1].includes("particlesActive=false")) {
    lines.splice(i, 3, // Replace stop + clear lines
      " // Fade out particles gradually",
      " const fadeParticles=()=>{particleFade-=0.02;if(particleFade<=0){particleFade=0;particlesActive=false;px.clearRect(0,0,pc.width,pc.height);}};",
      " const pFadeInterval=setInterval(()=>{fadeParticles();if(particleFade<=0)clearInterval(pFadeInterval);},50);",
    );
    console.log('Changed particle stop to fade out');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');
