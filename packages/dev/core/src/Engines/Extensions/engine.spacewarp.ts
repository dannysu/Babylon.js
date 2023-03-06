import { Engine } from "../../Engines/engine";
import { InternalTexture, InternalTextureSource } from "../../Materials/Textures/internalTexture";
import type { WebGLRenderTargetWrapper } from "../WebGL/webGLRenderTargetWrapper";
import type { RenderTargetWrapper } from "../renderTargetWrapper";
import { Matrix } from "../../Maths/math.vector";
import { Scene } from "../../scene";

declare module "../../Engines/engine" {
    export interface Engine {
        /**
         * Creates a new Space Warp render target
         * @param width defines the width of the texture
         * @param height defines the height of the texture
         * @param motionVectorTexture WebGLTexture from XRWebGLSubImage
         * @param depthStencilTexture WebGLTexture from XRWebGLSubImage
         * @returns the created Space Warp render target wrapper
         */
        createSpaceWarpRenderTargetTexture(width: number, height: number, motionVectorTexture: WebGLTexture, depthStencilTexture: WebGLTexture): RenderTargetWrapper;

        /**
         * Binds a Space Warp render target wrapper to be drawn to
         * @param spaceWarpTexture render target wrapper to bind
         */
        bindSpaceWarpFramebuffer(spaceWarpTexture: RenderTargetWrapper): void;
    }
}

Engine.prototype.createSpaceWarpRenderTargetTexture = function (width: number, height: number, motionVectorTexture: WebGLTexture, depthStencilTexture: WebGLTexture) {
    const gl = this._gl;

    if (!this.getCaps().multiview) {
        throw new Error("Space Warp requires multiview");
    }

    const rtWrapper = this._createHardwareRenderTargetWrapper(false, false, { width, height }) as WebGLRenderTargetWrapper;

    rtWrapper._framebuffer = gl.createFramebuffer();

    const internalTexture = new InternalTexture(this, InternalTextureSource.Unknown, true);
    internalTexture.width = width;
    internalTexture.height = height;
    internalTexture.isMultiview = true;

    rtWrapper._colorTextureArray = motionVectorTexture;
    rtWrapper._depthStencilTextureArray = depthStencilTexture;
    rtWrapper._alwaysDisposeOnlyFramebuffers = true;

    internalTexture.isReady = true;

    rtWrapper.setTextures(internalTexture);
    rtWrapper._depthStencilTexture = internalTexture;

    return rtWrapper;
};

Engine.prototype.bindSpaceWarpFramebuffer = function (_spaceWarpTexture: RenderTargetWrapper) {
    const spaceWarpTexture = _spaceWarpTexture as WebGLRenderTargetWrapper;

    const gl: any = this._gl;
    const ext = this.getCaps().oculusMultiview || this.getCaps().multiview;

    this.bindFramebuffer(spaceWarpTexture, undefined, undefined, undefined, true);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, spaceWarpTexture._framebuffer);
    if (spaceWarpTexture._colorTextureArray && spaceWarpTexture._depthStencilTextureArray) {
        ext.framebufferTextureMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, spaceWarpTexture._colorTextureArray, 0, 0, 2);
        ext.framebufferTextureMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, spaceWarpTexture._depthStencilTextureArray, 0, 0, 2);
    } else {
        throw "Invalid Space Warp framebuffer";
    }
};

declare module "../../scene" {
    export interface Scene {
        /** @internal */
        _prevTransformMatrix: Matrix | undefined;
        _prevTransformMatrixR: Matrix | undefined;
        /** @internal */
        _getPreviousTransformMatrix(): Matrix;
        _getPreviousTransformMatrixR(): Matrix;
        _savePreviousTransformMatrix(): void;
    }
}

Scene.prototype._getPreviousTransformMatrix = function() {
    if (!this._prevTransformMatrix) {
        return this.getTransformMatrix();
    }
    return this._prevTransformMatrix;
};

Scene.prototype._getPreviousTransformMatrixR = function() {
    if (!this._prevTransformMatrixR) {
        return this._transformMatrixR;
    }
    return this._prevTransformMatrixR;
};

Scene.prototype._savePreviousTransformMatrix = function () {
    if (!this._prevTransformMatrix) {
        this._prevTransformMatrix = this.getTransformMatrix().clone();
    } else {
        this._prevTransformMatrix.copyFrom(this.getTransformMatrix());
    }

    if (!this._prevTransformMatrixR) {
        this._prevTransformMatrixR = this._transformMatrixR.clone();
    } else {
        this._prevTransformMatrixR.copyFrom(this._transformMatrixR);
    }
};
