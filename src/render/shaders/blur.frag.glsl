#version 300 es
precision highp float;

// Precomputed weights for a 9-sample Gaussian blur

const float WEIGHTS[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216); 
in vec2 vUv;

uniform sampler2D uImage;
uniform vec2 uStep;
uniform float uThreshold;

out vec4 fragColor;

vec3 bright(vec2 uv) {
  return max(texture(uImage, uv).rgb - uThreshold, 0.0);
}

void main() {
  vec3 sum = WEIGHTS[0] * bright(vUv);
  for (int i = 1; i < 5; i++)
    sum += WEIGHTS[i] * (bright(vUv + float(i) * uStep) + bright(vUv - float(i) * uStep));
  fragColor = vec4(sum, 1.0);
}
