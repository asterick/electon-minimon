/*
ISC License

Copyright (c) 2019, Bryon Vandiver

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

import './style.css';

import { useRef, useContext, useEffect } from 'react';
import SystemContext from '../context';

import VertexShader from './shaders/vertex.glsl';
import FragmentShader from './shaders/fragment.glsl';

const VRAM_WIDTH = 96;
const VRAM_HEIGHT = 64;

export default function Screen() {
  const context = useContext(SystemContext);
  const canvasRef = useRef(null);
  const glRef = useRef(null);

  let tex: WebGLTexture | null = null;
  let verts: WebGLBuffer | null = null;
  let program: WebGLProgram | null = null;
  let attributes = {};
  let uniforms = {};
  let animID: number = 0;

  function init() {
    const gl = canvasRef.current?.getContext('webgl2', {
      preserveDrawingBuffer: true,
      alpha: false,
    });

    glRef.current = gl;

    if (!gl) return;

    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.DITHER);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.colorMask(true, true, true, false);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VertexShader);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vertexShader));
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, FragmentShader);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fragmentShader));
      return;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getError());
      return;
    }

    const attrCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    attributes = {};

    for (let i = 0; i < attrCount; i++) {
      const attr = gl.getActiveAttrib(program, i);
      attributes[attr.name] = i;
    }

    const uniCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    uniforms = {};

    for (let i = 0; i < uniCount; i++) {
      const uni = gl.getActiveUniform(program, i);
      uniforms[uni.name] = gl.getUniformLocation(program, uni.name);
    }

    verts = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        1,
        -1,
        VRAM_WIDTH,
        VRAM_HEIGHT,
        1,
        1,
        VRAM_WIDTH,
        0,
        -1,
        -1,
        0,
        VRAM_HEIGHT,
        -1,
        1,
        0,
        0,
      ]),
      gl.STATIC_DRAW,
    );

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      128,
      64,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(128 * 64 * 4),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  }

  function redraw() {
    const gl = glRef.current;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    animID = requestAnimationFrame(redraw);

    if (
      width !== canvasRef.current.width ||
      height !== canvasRef.current.height
    ) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      if ((width * 2) / 3 > height) {
        const fitX = Math.floor((height * 3) / 2);
        gl.viewport((width - fitX) / 2, 0, fitX, height);
      } else {
        const fitY = (width * 2) / 3;
        gl.viewport(0, (height - fitY) / 2, width, fitY);
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      VRAM_WIDTH,
      VRAM_HEIGHT,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      context.system.state.buffers.framebuffer,
    );

    gl.clearColor(
      context.system.clearColor.r,
      context.system.clearColor.g,
      context.system.clearColor.b,
      1.0,
    );
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.enableVertexAttribArray(attributes.position);
    gl.enableVertexAttribArray(attributes.uv);
    gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(attributes.uv, 2, gl.FLOAT, false, 16, 8);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  useEffect(() => {
    if (glRef.current == null) {
      init();
    }
    redraw();

    return () => {
      cancelAnimationFrame(animID);
      glRef.current = null;
      animID = 0;
    };
  });

  return <canvas className="screen" ref={canvasRef} />
}
