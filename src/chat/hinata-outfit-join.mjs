import { Filter, GlProgram } from './vendor/pixi-hinata.mjs';

// Blend the last 30 pixels of the blouse into the opaque lower outfit.
// This is an overlap seam: clothing underneath remains fully opaque.
export function outfitJoin() {
  return new Filter({
    glProgram: GlProgram.from({
      name: 'hinata-outfit-join',
      vertex: `
        in vec2 aPosition;
        out vec2 vTextureCoord;
        out float vHeight;
        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;
        void main() {
          vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
          p.x = p.x * (2.0 / uOutputTexture.x) - 1.0;
          p.y = p.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
          gl_Position = vec4(p, 0.0, 1.0);
          vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
          vHeight = aPosition.y;
        }`,
      fragment: `
        in vec2 vTextureCoord;
        in float vHeight;
        uniform sampler2D uTexture;
        out vec4 finalColor;
        void main() {
          finalColor = texture(uTexture, vTextureCoord)
            * (1.0 - smoothstep(0.945, 0.995, vHeight));
        }`
    }),
    padding: 0,
    resolution: 'inherit'
  });
}
