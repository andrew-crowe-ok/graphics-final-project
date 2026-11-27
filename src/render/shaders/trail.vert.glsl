#version 300 es
in vec3 aPosition;
in vec2 aTexCoord;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
}
