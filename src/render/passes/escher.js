export function createEscherPass(gl, vertexSource, fragmentSource) {
let escher = null;

//Compile an individual shader.
function compileEscherShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }

    return shader;
}

//Create a regular reusable 2D WebGL texture.
function createEscherTexture() {
    const tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    //CLAMP_TO_EDGE keeps sampling within the image boundaries.
    //The texture() call therefore needs no explicit UV clamp.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return tex;
}

//Called only once.
function initEscherGPU() {
    //Create shader program.
    const vs = compileEscherShader(
        gl.VERTEX_SHADER, vertexSource
    );

    const fs = compileEscherShader(
        gl.FRAGMENT_SHADER, fragmentSource
    );

    const program = gl.createProgram();

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    //Cache uniform locations so they are not queried every frame.
    const uniforms = {};
    const names = [
        "uScene", "uResolution", "uPivot",
        "uAngle", "uArms", "uStrength",
        "uRepeat", "uFrameScale"
    ];

    for (const name of names) {
        uniforms[name] = gl.getUniformLocation(program, name);
    }

    //Source is the unmodified scene.
    //Output holds the transformed scene.
    const source = createEscherTexture();
    const output = createEscherTexture();

    /*
     * WebGL documentation: framebufferTexture2D()
     *
     * Attaches a texture to a framebuffer. Drawing to that
     * framebuffer writes pixels into the attached texture.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/framebufferTexture2D
     */
    const fbo = gl.createFramebuffer();

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo);

    gl.framebufferTexture2D(
        gl.DRAW_FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        output,
        0
    );

    /*
     * WebGL documentation: bindVertexArray()
     *
     * VAOs store vertex-array configuration. This shader uses
     * gl_VertexID instead of vertex attributes, so an empty
     * VAO is sufficient.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/bindVertexArray
     */
    const vao = gl.createVertexArray();

    return {
        program,
        uniforms,
        source,
        output,
        fbo,
        vao,
        width: 0,
        height: 0
    };
}


// ============================================================
// 3. APPLY TRANSFORMATION
// ============================================================

function applyEscherGPU({
    angle = 0.10,
    arms = 4.0,
    strength = 0.75,
    repeat = 5.0,
    frameScale = 0.52,
    pivot = [0.5, 0.5],
    show = true
} = {}) {

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    //Save the state needed to avoid interfering with
    //the rest of the game's WebGL rendering.
    const previous = {
        read: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
        draw: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
        viewport: gl.getParameter(gl.VIEWPORT),
        program: gl.getParameter(gl.CURRENT_PROGRAM),
        vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
        activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
        colorMask: gl.getParameter(gl.COLOR_WRITEMASK)
    };

    const flags = [
        gl.DEPTH_TEST,
        gl.BLEND,
        gl.SCISSOR_TEST,
        gl.CULL_FACE,
        gl.STENCIL_TEST,
        gl.RASTERIZER_DISCARD
    ];

    const enabled = flags.map(flag => gl.isEnabled(flag));

    gl.activeTexture(gl.TEXTURE0);
    const oldTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);

    try {
        if (!escher) {
            escher = initEscherGPU();
        }

        const e = escher;

        // ----------------------------------------
        // Resize textures if canvas size changed.
        // ----------------------------------------

        if (w !== e.width || h !== e.height) {
            e.width = w;
            e.height = h;

            /*
             * texImage2D() allocates texture image storage.
             *
             * Passing null for pixel data allocates the image
             * without uploading any pixels from the CPU.
             *
             * RGBA8 is a sized internal format in WebGL2.
             *
             * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
             */
            for (const tex of [e.source, e.output]) {
                gl.bindTexture(gl.TEXTURE_2D, tex);

                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA8,
                    w, h,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                );
            }

            /*
             * checkFramebufferStatus() reports whether a
             * framebuffer has complete, usable attachments.
             *
             * Check after allocating/resizing the output
             * texture because the FBO refers to that texture.
             *
             * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/checkFramebufferStatus
             */
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, e.fbo);

            if (gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER)
                    !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error("Escher framebuffer is incomplete");
            }
        }

        // ----------------------------------------
        // Copy screen -> source texture.
        // ----------------------------------------


        //Use a supplied texture, or capture the canvas.
        let source = null;

        if (!source) {
            /*
            * copyTexSubImage2D() copies pixels from the
            * current READ_FRAMEBUFFER into an existing texture.
            *
            * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/copyTexSubImage2D
            */
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, e.source);

            gl.copyTexSubImage2D(
                gl.TEXTURE_2D,
                0,
                0, 0,
                0, 0,
                w, h
            );

            source = e.source;
        }

        // Prevent reading and writing the same texture.
        if (source === e.output) {
            throw new Error("Cannot use Escher output as its own input");
        }

        // ----------------------------------------
        // Render source -> output texture.
        // ----------------------------------------

        /*
         * In WebGL2, READ_FRAMEBUFFER and DRAW_FRAMEBUFFER
         * can be bound independently.
         *
         * Binding the FBO as DRAW_FRAMEBUFFER sends fragment
         * shader output into its attached output texture.
         *
         * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindFramebuffer
         */
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, e.fbo);

        gl.viewport(0, 0, w, h);

        //Fullscreen post-processing shouldn't be affected
        //by depth, blending, clipping, or stencil state.
        flags.forEach(flag => gl.disable(flag));
        gl.colorMask(true, true, true, true);

        gl.useProgram(e.program);
        gl.bindVertexArray(e.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, source);

        //Set shader parameters.
        const u = e.uniforms;

        gl.uniform1i(u.uScene, 0);
        gl.uniform2f(u.uResolution, w, h);
        gl.uniform2f(u.uPivot, pivot[0], pivot[1]);

        gl.uniform1f(u.uAngle, angle);
        gl.uniform1f(u.uArms, arms);
        gl.uniform1f(u.uStrength, strength);
        gl.uniform1f(u.uRepeat, repeat);
        gl.uniform1f(u.uFrameScale, frameScale);

        // Draw a fullscreen triangle.
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // ----------------------------------------
        // Optionally display the result.
        // ----------------------------------------

        if (show) {
            /*
             * blitFramebuffer() transfers a rectangular block
             * of pixels from the read framebuffer to the draw
             * framebuffer.
             *
             * Here:
             *   READ = transformed texture's framebuffer
             *   DRAW = default canvas framebuffer
             *
             * This displays the texture without another shader.
             *
             * https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/blitFramebuffer
             */
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, e.fbo);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

            gl.blitFramebuffer(
                0, 0, w, h,
                0, 0, w, h,
                gl.COLOR_BUFFER_BIT,
                gl.NEAREST
            );
        }

        return e.output;

    } finally {
        //Restore previous bindings and rendering state.
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous.read);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previous.draw);

        gl.viewport(...previous.viewport);
        gl.useProgram(previous.program);
        gl.bindVertexArray(previous.vao);
        gl.colorMask(...previous.colorMask);

        flags.forEach((flag, i) => {
            if (enabled[i]) gl.enable(flag);
            else gl.disable(flag);
        });

        gl.bindTexture(gl.TEXTURE_2D, oldTexture);
        gl.activeTexture(previous.activeTexture);
    }
}

  return applyEscherGPU;
}
