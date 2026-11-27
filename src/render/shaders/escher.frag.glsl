#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform vec2 uPivot;

uniform float uAngle;
uniform float uArms;
uniform float uStrength;
uniform float uRepeat;
uniform float uFrameScale;

out vec4 fragColor;

// -----------------------------
// Complex number operations
// -----------------------------

vec2 logZ(vec2 z) {
    return vec2(
        log(max(length(z), 1e-8)),
        atan(z.y, z.x)
    );
}

vec2 expZ(vec2 z) {
    return exp(z.x) * vec2(cos(z.y), sin(z.y));
}

vec2 rotateZ(vec2 z, float angle) {
    float c = cos(angle);
    float s = sin(angle);

    return vec2(
        c*z.x - s*z.y,
        s*z.x + c*z.y
    );
}

//Log(z) transform from 3bluonebrown video
vec2 mapZ(vec2 z) {
    float R = 0.7;

    //Map into logarithmic coordinates.
    vec2 w = logZ(z / R);

    //Rotate and scale in log space.
    vec2 mapped = rotateZ(w, -uAngle) * uArms;

    //Interpolate between original and mapped.
    w = mix(w, mapped, clamp(uStrength, 0.0, 1.0));

    //Radial repetition for recursive copies.
    if (uRepeat > 1.0) {
        float period = log(uRepeat);
        w.x = -mod(-w.x, period);
    }

    //Return to the complex plane.
    return R * expZ(w);
}

void main() {
    //Screen coordinates -> complex plane.
    //Dividing by height preserves aspect ratio.
    vec2 z = (gl_FragCoord.xy - uPivot * uResolution)
             / uResolution.y;

    //Apply the mathematical transformation.
    vec2 t = mapZ(z);

    //Complex plane -> texture coordinates.
    vec2 uv = uPivot + uFrameScale * vec2(
        t.x * uResolution.y / uResolution.x,
        t.y
    );

    fragColor = texture(uScene, uv);
}
