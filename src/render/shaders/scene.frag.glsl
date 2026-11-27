#version 300 es
precision highp float;

const int NO_MAPPING = 0, EMISSION_MAPPING = 1, FLOOR_MAPPING = 2;
const int CIRCUIT_FLOOR = 0, CONFORMAL_FLOOR = 1, PLAIN_FLOOR = 2;
const int MAX_ARROWS = 32;
const float ARROW_FLASH = 8.0, ARROW_HALO = 0.6;
const float CONFORMAL_GAIN = 0.8, PLAIN_GRAY = 128.0 / 255.0;
const float Ka = 1.6;
const float Kd = 0.6;
const float FOG_START = 22.0, FOG_DENSITY = 0.02;

in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;
in vec3 vShadowCoord;

uniform vec3 uLightDir[2];
uniform vec3 uLightColor[2];
uniform vec3 uUp;
uniform vec3 uFogColor;
uniform vec3 uBoardOrigin;
uniform vec3 uBoardX;
uniform vec3 uBoardY;
uniform vec3 uFloorNormal;
uniform vec4 uFloorRects[3];
uniform vec4 uClipPlane;
uniform vec2 uScreenSize;
uniform vec3 uFloorEmissive;
uniform vec4 uFloorRect;
uniform vec3 uArrows[MAX_ARROWS];
uniform mat3 uView;

uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec3 uTopEmissive;
uniform float uKs;
uniform float uShininess;
uniform float uReflectivity;
uniform float uMirror;
uniform float uShade;

uniform sampler2D uTexture;
uniform sampler2D uFloorTex0;
uniform sampler2D uFloorTex1;
uniform sampler2D uFloorTex2;
uniform sampler2D uReflection;
uniform samplerCube uEnvironment;
uniform highp sampler2DShadow uShadowMap;
uniform int uMapping;
uniform int uFloorStyle;

out vec4 fragColor;

vec3 calculateLight(int i, vec3 N, vec3 V, vec3 color) {
  vec3 L = normalize(uLightDir[i]);
  vec3 H = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float spec = diff > 0.0 ? pow(max(dot(N, H), 0.0), uShininess) : 0.0;
  return uLightColor[i] * (Kd * diff * color + uKs * spec);
}

float schlick(float F0, vec3 N, vec3 V) {
  return F0 + (1.0 - F0) * pow(1.0 - max(dot(N, V), 0.0), 5.0);
}

float arrowGlowAt(vec2 p) {
  float glow = 0.0;
  for (int i = 0; i < MAX_ARROWS; i++)
    glow += uArrows[i].z * (1.0 - smoothstep(0.8, 1.0, distance(p, uArrows[i].xy)));
  return glow;
}

vec2 floorUv(vec2 uv, vec4 rect) {
  if (uFloorStyle == CIRCUIT_FLOOR) return uv;
  vec2 size = rect.zw - rect.xy;
  return 0.5 + (uv - 0.5) * vec2(size.x / size.y * uScreenSize.y / uScreenSize.x, 1.0);
}

vec3 floorEmission(vec3 texel) {
  if (uFloorStyle == CONFORMAL_FLOOR) return CONFORMAL_GAIN * texel;
  if (uFloorStyle == PLAIN_FLOOR) return uFloorEmissive * PLAIN_GRAY;
  return uFloorEmissive * texel;
}

vec3 sampleField(int idx, vec2 uv, vec2 p, float lod) {
  vec3 texel = idx == 0 ? textureLod(uFloorTex0, uv, lod).rgb
             : idx == 1 ? textureLod(uFloorTex1, uv, lod).rgb
                        : textureLod(uFloorTex2, uv, lod).rgb;
  vec3 emission = floorEmission(texel);
  float glow = arrowGlowAt(p);
  return emission * (1.0 + ARROW_FLASH * glow) + ARROW_HALO * glow * uFloorEmissive;
}

vec3 playfield(vec3 R) {
  vec3 n = uFloorNormal;
  float denom = dot(R, n);
  if (denom >= -1e-4) return vec3(0.01);
  float t = dot(uBoardOrigin - vPosition, n) / denom;
  if (t <= 0.0) return vec3(0.01);
  vec3 h = vPosition + t * R - uBoardOrigin;
  vec2 p = vec2(dot(h, uBoardX), dot(h, uBoardY));
  float lod = log2(1.0 + t * 0.2);
  float rd = FOG_DENSITY * max(t - FOG_START * 0.5, 0.0);
  float atten = exp(-rd * rd);
  for (int i = 0; i < 3; i++) {
    vec4 r = uFloorRects[i];
    if (all(greaterThanEqual(p, r.xy)) && all(lessThanEqual(p, r.zw))) {
      vec2 uv = (p - r.xy) / (r.zw - r.xy);
      return mix(uFogColor, sampleField(i, floorUv(uv, r), p, lod), atten);
    }
  }
  return vec3(0.01);
}

vec3 environment(vec3 R) {
  float h = dot(R, uFloorNormal);
  vec3 scene = texture(uEnvironment, transpose(uView) * R).rgb;
  if (h > 0.0) return scene;
  return mix(scene, playfield(R), smoothstep(0.0, 0.25, -h));
}

vec3 reflection(vec2 uv) {
  vec2 h = 1.0 / vec2(textureSize(uReflection, 0));
  return 0.25 * (texture(uReflection, uv + h).rgb + texture(uReflection, uv - h).rgb
               + texture(uReflection, uv + vec2(h.x, -h.y)).rgb + texture(uReflection, uv - vec2(h.x, -h.y)).rgb);
}

void main() {
  if (dot(uClipPlane, vec4(vPosition, 1.0)) < 0.0) discard;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vPosition);
  float depthTest = texture(uShadowMap, vShadowCoord);
  bool inShadowMap = all(greaterThan(vShadowCoord, vec3(0.0))) && all(lessThan(vShadowCoord, vec3(1.0)));
  float shadow = inShadowMap ? smoothstep(0.3, 0.7, depthTest) : 1.0;

  vec3 result = Ka * uFogColor * uColor;
  result += shadow * calculateLight(0, N, V, uColor);
  result += calculateLight(1, N, V, uColor);

  if (uReflectivity > 0.0)
    result += schlick(uReflectivity, N, V) * environment(reflect(-V, N));

  vec2 uv = uMapping == FLOOR_MAPPING ? floorUv(vTexCoord, uFloorRect) : vTexCoord;
  vec3 texel = texture(uTexture, uv).rgb;
  vec3 emission = uMapping == NO_MAPPING ? uEmissive : uEmissive * texel;
  if (uMapping == FLOOR_MAPPING) {
    emission = floorEmission(texel);
    float glow = arrowGlowAt(mix(uFloorRect.xy, uFloorRect.zw, vTexCoord));
    emission = emission * (1.0 + ARROW_FLASH * glow) + ARROW_HALO * glow * uEmissive;
  }
  result += emission + uTopEmissive * smoothstep(0.7, 0.9, dot(N, uUp));

  result *= mix(1.0 - uShade, 1.0, shadow);
  float d = FOG_DENSITY * max(length(vPosition) - FOG_START, 0.0);
  vec3 mirror = uMirror > 0.0 ? schlick(uMirror, N, V) * reflection(gl_FragCoord.xy / uScreenSize) : vec3(0.0);
  fragColor = vec4(mix(uFogColor, result, exp(-d * d)) + mirror, 1.0);
}
