#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vDirection;
out vec3 vOrigin;

void main() {
  vec2 p = corners[gl_VertexID];
  vec4 eye = inverse(uProjection) * vec4(p, 1.0, 1.0);
  vDirection = transpose(mat3(uView)) * (eye.xyz / eye.w);
  vOrigin = -transpose(mat3(uView)) * uView[3].xyz;
  gl_Position = vec4(p, 1.0, 1.0);
}
