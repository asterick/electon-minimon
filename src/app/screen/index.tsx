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

import "./style.css";

import Minimon from "../system";
import { createRef, Component } from "react";
import SystemContext from "../context";

import VertexShader from "./shaders/vertex.glsl";
import FragmentShader from "./shaders/fragment.glsl";

const VRAM_WIDTH  = 96;
const VRAM_HEIGHT = 64;

export default class Screen extends Component {
	static contextType = SystemContext;

  private context:Minimon;
  private ref:React.RefObject<HTMLCanvasElement>;
  private ctx:WebGL2RenderingContext | null | undefined;
  private tex:WebGLTexture | null;
  private verts:WebGLBuffer | null;
  private program:WebGLProgram | null;
  private attributes;
  private uniforms;

  private contrast:number;
  private animID:number;

  constructor(props) {
		super(props);

		this.ref = createRef();
    this.ctx = null;
    this.tex = null;
    this.verts = null;
    this.attributes = {};
    this.uniforms = {};
    this.program = null;
    this.animID = 0;

    this.contrast = 0.5;
	}

	componentDidMount() {
    this.ctx = this.ref.current?.getContext("webgl2", {
      preserveDrawingBuffer: true,
      alpha: false
    });

    this.init();
    this.redraw();
    this.context.repaint = this.updateTexture;
  }

	componentWillUnmount() {
		cancelAnimationFrame(this.animID);
		this.ctx = null;
    this.animID = 0;

		delete this.context.repaint;
	}

  onDragOver (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  onDragLeave () {
  }

  onDrop (e) {
    e.preventDefault();

    var file = e.dataTransfer.files[0],
    reader = new FileReader();

    reader.onload = (e) => {
      this.context.system.load(e.target.result);
    };

    reader.readAsArrayBuffer(file);
  }

	init() {
		const gl = this.ctx;

    if (!gl) return ;

		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.DITHER);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		gl.colorMask(true, true, true, false);
		gl.clearColor(0xB7 / 255, 0xCA / 255, 0xB7 / 255, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		var vertexShader =  gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, VertexShader);
		gl.compileShader(vertexShader);

		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			return null;
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, FragmentShader);
		gl.compileShader(fragmentShader);

		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			return null;
		}

		this.program = gl.createProgram();
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error(gl.getError());
			return null;
		}

		const attrCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
		this.attributes = {};

		for (var i = 0; i < attrCount; i++) {
			const attr = gl.getActiveAttrib(this.program, i);
			this.attributes[attr.name] = i;
		}

		const uniCount= gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
		this.uniforms = {};

		for (var i = 0; i < uniCount; i++) {
			const uni = gl.getActiveUniform(this.program, i);
			this.uniforms[uni.name] = gl.getUniformLocation(this.program, uni.name);
		}

		this.verts = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.verts);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
       1,-1, VRAM_WIDTH, VRAM_HEIGHT,
       1, 1, VRAM_WIDTH,           0,
      -1,-1,          0, VRAM_HEIGHT,
      -1, 1,          0,           0
    ]), gl.STATIC_DRAW);

		this.tex = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 128, 64, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(0x2000));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	}

	private updateTexture = (memory:Uint8Array, constrast:number) => {
    const gl = this.ctx;

    if (!gl) return ;

    this.contrast = constrast / 0x3F;

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, VRAM_WIDTH, VRAM_HEIGHT, gl.RED, gl.UNSIGNED_BYTE, memory);
  }

  private redraw = () => {
    const gl = this.ctx;
    const width = this.ref.current.clientWidth;
    const height = this.ref.current.clientHeight;

    if (width != this.ref.current.width || height != this.ref.current.height) {
      this.ref.current.width = width;
      this.ref.current.height = height;

      if (width * 2 / 3 > height) {
        let fit_x = Math.floor(height * 3 / 2);
        gl.viewport((width - fit_x) / 2, 0, fit_x, height);
      } else {
        let fit_y = width * 2 / 3;
        gl.viewport(0, (height - fit_y) / 2, width, fit_y);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    gl.uniform1f(this.uniforms.contrast, this.contrast);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.verts);
    gl.enableVertexAttribArray(this.attributes.position);
    gl.enableVertexAttribArray(this.attributes.uv);
    gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this.attributes.uv, 2, gl.FLOAT, false, 16, 8);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.animID = requestAnimationFrame(this.redraw);
  }

	render() {
		return (
			<div onDragOver={(e) => this.onDragOver(e)}
				onDragLeave={(e) => this.onDragLeave(e)}
				onDrop={(e) => this.onDrop(e)}
				className="screen">
				<canvas ref={this.ref} />
			</div>
		);
	}
}
