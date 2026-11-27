#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform vec3 uColor;

out vec4 fragColor;

void main() {
  float fade = 1.0 - vTexCoord.x;
  float core = 1.0 - vTexCoord.y * vTexCoord.y;
  fragColor = vec4(uColor * core * fade * fade, 1.0);
}
