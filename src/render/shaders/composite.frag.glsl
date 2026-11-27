#version 300 es
precision highp float;

const float EXPOSURE = 1.4;

in vec2 vUv;

uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform float uBloomStrength;

out vec4 fragColor;

void main() {
  vec3 bloom = texture(uBloom0, vUv).rgb + texture(uBloom1, vUv).rgb
             + texture(uBloom2, vUv).rgb + texture(uBloom3, vUv).rgb;
  vec3 hdr = EXPOSURE * (texture(uScene, vUv).rgb + uBloomStrength * bloom);
  vec2 c = vUv - 0.5;
  fragColor = vec4(hdr / (1.0 + hdr) * (1.0 - 0.6 * dot(c, c)), 1.0);
}
