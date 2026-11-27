#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat4 uShadowMatrix;
uniform vec2 uTexRepeat;

out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;
out vec3 vShadowCoord;

void main() {
  vec4 p = uModelView * vec4(aPosition, 1.0);
  vPosition = p.xyz;
  vNormal = transpose(inverse(mat3(uModelView))) * aNormal;
  vTexCoord = aTexCoord * uTexRepeat;
  vShadowCoord = (uShadowMatrix * vec4(aPosition, 1.0)).xyz;
  gl_Position = uProjection * p;
}
