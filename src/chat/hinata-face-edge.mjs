import { Filter, GlProgram } from './vendor/pixi-hinata.mjs';

// Only the painted face changes expression. The underlying head silhouette,
// hair, neck and blouse stay on the same drawing, so they cannot jump frames.
export function faceEdge() {
  return new Filter({
    glProgram: GlProgram.from({
      name: 'hinata-face-edge',
      vertex: `
        in vec2 aPosition;
        out vec2 vTextureCoord;
        out vec2 vPosition;
        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;
        void main() {
          vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
          p.x = p.x * (2.0 / uOutputTexture.x) - 1.0;
          p.y = p.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
          gl_Position = vec4(p, 0.0, 1.0);
          vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
          vPosition = aPosition;
        }`,
      fragment: `
        in vec2 vTextureCoord;
        in vec2 vPosition;
        uniform sampler2D uTexture;
        out vec4 finalColor;
        void main() {
          vec2 edge = smoothstep(vec2(0.0), vec2(0.07), vPosition)
            * smoothstep(vec2(0.0), vec2(0.07), 1.0-vPosition);
          finalColor = texture(uTexture, vTextureCoord) * edge.x * edge.y;
        }`
    }), padding: 0, resolution: 'inherit'
  });
}
