#version 300 es

in vec2 vertex;
in vec2 uv;
out vec2 position;
out vec2 texpos;

void main(void) {
    position = vertex;
    texpos = uv;
    gl_Position = vec4(vertex * vec2(1.0, -1.0), 1.0, 1.0);
}
