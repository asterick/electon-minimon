#version 300 es

precision mediump float;

uniform mediump sampler2D vram;
uniform mediump sampler2D palette;
uniform float contrast;

in vec2 texpos;
out vec4 fragColor;

void main(void) {
  vec4 frag = texelFetch(vram, ivec2(texpos), 0);
	fragColor.rgb = frag.rgb * contrast;
	fragColor.a = 1.0;
}
