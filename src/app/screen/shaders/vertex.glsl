#version 300 es

in vec2 vertex;
in vec2 uv;
out vec2 texpos;

void main(void) {
    texpos = uv;

    gl_Position = vec4(vertex, 1.0, 1.0);
}
