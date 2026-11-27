#version 300 es
in vec3 aPosition;
uniform mat4 uLightMVP;

void main() {
  gl_Position = uLightMVP * vec4(aPosition, 1.0);
}
