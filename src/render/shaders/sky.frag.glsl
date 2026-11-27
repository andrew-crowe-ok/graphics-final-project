#version 300 es
precision highp float;

const float STAR_BRIGHTNESS = 4.0;
const float CEILING_HEIGHT = 12.0, CEILING_CELL = 4.0, CEILING_GLOW = 0.6, HORIZON_GLOW = 1.5;

in vec3 vDirection;
in vec3 vOrigin;

uniform vec3 uFogColor;
uniform vec3 uSkyColor;
uniform vec3 uGridColor;
uniform float uTime;
uniform float uStarScale;

out vec4 fragColor;

float ceiling(vec3 d) {
  float t = (CEILING_HEIGHT - vOrigin.z) / max(d.z, 0.001);
  vec2 p = (vOrigin.xy + d.xy * t) / CEILING_CELL;
  vec2 a = abs(fract(p + 0.5) - 0.5) / fwidth(p);
  return (1.0 - min(min(a.x, a.y), 1.0)) * smoothstep(0.0, 0.25, d.z) * smoothstep(0.0, 4.0, CEILING_HEIGHT - vOrigin.z);
}

float stars(vec3 d) {
  vec3 p = d * uStarScale;
  vec3 cell = floor(p);
  float h = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float r = length(p - cell - 0.5);
  float twinkle = 0.7 + 0.3 * sin(uTime * 3.0 + h * 100.0);
  return step(0.985, h) * smoothstep(0.0, 0.3, d.z) * smoothstep(0.3, 0.0, r) * twinkle;
}

void main() {
  vec3 d = normalize(vDirection);
  vec3 color = mix(uFogColor, uSkyColor, smoothstep(0.0, 0.5, d.z));
  color += HORIZON_GLOW * uFogColor * exp(-8.0 * abs(d.z));
  color += CEILING_GLOW * uGridColor * ceiling(d);
  fragColor = vec4(color + STAR_BRIGHTNESS * vec3(stars(d)), 1.0);
}
