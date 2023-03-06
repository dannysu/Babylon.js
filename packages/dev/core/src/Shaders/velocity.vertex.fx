#define CUSTOM_VERTEX_BEGIN
#define VELOCITY

// Attributes

attribute vec3 position;

// Uniforms

#include<instancesDeclaration>

uniform mat4 viewProjection;
uniform mat4 viewProjectionR;
uniform mat4 previousViewProjection;
uniform mat4 previousViewProjectionR;

// Output

varying vec4 clipPos;
varying vec4 previousClipPos;

#define CUSTOM_VERTEX_DEFINITIONS

void main(void) {

#define CUSTOM_VERTEX_MAIN_BEGIN

	vec3 positionUpdated = position;

#include<instancesVertex>
#
	vec4 worldPos = finalWorld * vec4(positionUpdated, 1.0);
    vec4 previousWorldPos = finalPreviousWorld * vec4(positionUpdated, 1.0);

	if (gl_ViewID_OVR == 0u) {
        clipPos = viewProjection * worldPos;
        previousClipPos = previousViewProjection * previousWorldPos;
		gl_Position = clipPos;
	} else {
        clipPos = viewProjectionR * worldPos;
        previousClipPos = previousViewProjectionR * previousWorldPos;
		gl_Position = clipPos;
	}

#define CUSTOM_VERTEX_MAIN_END

}
