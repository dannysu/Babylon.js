import { RenderTargetTexture } from "../Textures/renderTargetTexture";
import type { Nullable } from "../../types";
import type { Scene } from "../../scene";
import { Constants } from "../../Engines/constants";
import type { Material } from "../material";
import { ShaderMaterial } from "../../Materials/shaderMaterial";
import "../../Shaders/velocity.fragment";
import "../../Shaders/velocity.vertex";
import { AbstractMesh } from "core/Meshes";
import { StandardMaterial } from "../standardMaterial";
import { Color3 } from "core/Maths";

/**
 * Used for Space Warp render targeting multiple views with a single draw call
 * @see https://www.khronos.org/registry/webgl/extensions/OVR_multiview2/
 */
export class SpaceWarpRenderTarget extends RenderTargetTexture {
    private _velocityMaterial: ShaderMaterial | undefined;
    private _standardMaterial: StandardMaterial | undefined;

    /**
     * Creates a Space Warp render target
     * @param motionVectorTexture WebGLTexture provided by WebGLSubImage
     * @param depthStencilTexture WebGLTexture provided by WebGLSubImage
     * @param scene scene used with the render target
     * @param size the size of the render target (used for each view)
     */
    constructor(motionVectorTexture: WebGLTexture, depthStencilTexture: WebGLTexture, scene?: Scene, size: number | { width: number; height: number } | { ratio: number } = 512) {
        super("spacewarp rtt", size, scene, false, true, Constants.TEXTURETYPE_HALF_FLOAT, false, undefined, false, false, true, undefined, true);
        this._renderTarget = this.getScene()!.getEngine().createSpaceWarpRenderTargetTexture(this.getRenderWidth(), this.getRenderHeight(), motionVectorTexture, depthStencilTexture);
        this._texture = this._renderTarget.texture!;
        this._texture.isMultiview = true;
        this._texture.format = Constants.TEXTUREFORMAT_RGBA;

        if (scene) {
            this._standardMaterial = new StandardMaterial("test", scene);
            this._standardMaterial.ambientColor = new Color3(1, 0, 0);
            this._standardMaterial.diffuseColor = new Color3(1, 0, 0);
            this._standardMaterial.freeze();

            this._velocityMaterial = new ShaderMaterial(
                'velocity shader material', // human name
                scene,
                {
                    vertex: 'velocity',
                    fragment: 'velocity',
                },
                {
                    uniforms: [
                        'world',
                        'previousWorld',
                        'viewProjection',
                        'viewProjectionR',
                        'previousViewProjection',
                        'previousViewProjectionR',
                    ],
                },
            );
            this._velocityMaterial.freeze();
        }
    }

    public render(useCameraPostProcess: boolean = false, dumpForDebug: boolean = false): void {
        // If I don't swap the material, then rendering doesn't turn black...
        // So maybe it's weirdly the material that's messing things up?

        // Since setting to StandardMaterial and swap back is fine... is it my ShaderMaterial?

        // Swap to use velocity material
        const originalPairing: Array<[AbstractMesh, Nullable<Material>]> = [];
        const scene = this.getScene();
        let meshes;
        if (scene && this._velocityMaterial && this._standardMaterial) {
            meshes = scene.getActiveMeshes();
            const velocityMaterial = this._velocityMaterial;
            const standardMaterial = this._standardMaterial;
            meshes.forEach((mesh) => {
                originalPairing.push([mesh, mesh.material]);
                mesh.material = velocityMaterial;
            });
        }

        super.render(useCameraPostProcess, dumpForDebug);

        // Restore original material
        originalPairing.forEach((tuple) => {
            tuple[0].material = tuple[1];
        });
    }

    /**
     * @internal
     */
    public _bindFrameBuffer() {
        if (!this._renderTarget) {
            return;
        }
        this.getScene()!.getEngine().bindSpaceWarpFramebuffer(this._renderTarget);
    }

    /**
     * Gets the number of views the corresponding to the texture (eg. a SpaceWarpRenderTarget will have > 1)
     * @returns the view count
     */
    public getViewCount() {
        return 2;
    }
}
