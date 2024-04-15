#version 300 es

precision mediump float;

uniform mediump sampler2D vram;

in vec2 position;
in vec2 texpos;
out vec4 fragColor;

void main(void) {
  vec4 frag = texture(vram, texpos);
	fragColor.rgb = frag.rrr;
	fragColor.a = 1.0;
}
