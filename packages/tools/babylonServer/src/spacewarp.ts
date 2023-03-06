const canvas = document.getElementById("babylon-canvas") as HTMLCanvasElement; // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

const cubeCount = 10;
const totalCubes = cubeCount * cubeCount * cubeCount - 1;

class Playground {
    public static async CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);
        scene.ambientColor = new BABYLON.Color3(1, 1, 1);

        scene.clearColor = new BABYLON.Color4(0.1, 0.2, 0.3, 1);

        // Need this for rendering motion vector for Space Warp
        scene.needsPreviousWorldMatrices = true;

        // This creates and positions a free camera (non-mesh)
        const camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
        camera.minZ = 0;

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        const material = new BABYLON.StandardMaterial("webxr", scene);
        material.ambientTexture = new BABYLON.Texture("textures/cube-sea.png", scene);
        material.ambientColor = new BABYLON.Color3(1, 1, 1);
        material.freeze();

        const cubeGrid = BABYLON.MeshBuilder.CreateBox("cubeGrid");
        cubeGrid.material = material;

        // TODO: How to make all surfaces' material appear upright

        const dummy = BABYLON.Matrix.Scaling(0.4, 0.4, 0.4);

        const cubeGridMatricesData = new Float32Array(16 * totalCubes);

        let i = 0;
        const halfGrid = cubeCount * 0.5;
        for (let x = 0; x < cubeCount; x++) {
            for (let y = 0; y < cubeCount; y++) {
                for (let z = 0; z < cubeCount; z++) {
                    const positionX = x - halfGrid;
                    const positionY = y - halfGrid;
                    const positionZ = z - halfGrid;

                    if (positionX === 0 && positionY === 0 && positionZ === 0) {
                        continue;
                    }

                    dummy.setTranslationFromFloats(positionX, positionY, positionZ);

                    dummy.copyToArray(cubeGridMatricesData, i * 16);
                    i++;
                }
            }
        }

        cubeGrid.thinInstanceSetBuffer("matrix", cubeGridMatricesData, 16);

        const spinningCubes = BABYLON.MeshBuilder.CreateBox("spinningCubes");
        spinningCubes.material = material;

        const spinningCubesMatricesData = new Float32Array(16 * 4);

        const m = BABYLON.Matrix.Scaling(0.1, 0.1, 0.1);

        m.setTranslationFromFloats(0, 0.25, -0.8);
        m.copyToArray(spinningCubesMatricesData, 0 * 16);

        m.setTranslationFromFloats(0.8, 0.25, 0);
        m.copyToArray(spinningCubesMatricesData, 1 * 16);

        m.setTranslationFromFloats(0, 0.25, 0.8);
        m.copyToArray(spinningCubesMatricesData, 2 * 16);

        m.setTranslationFromFloats(-0.8, 0.25, 0);
        m.copyToArray(spinningCubesMatricesData, 3 * 16);

        spinningCubes.thinInstanceSetBuffer("matrix", spinningCubesMatricesData, 16);

        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                referenceSpaceType: 'local',
            },
            inputOptions: {
                doNotLoadControllerMeshes: true,
            },
            disablePointerSelection: true,
            optionalFeatures: ["space-warp"],
        });
        xrHelper.baseExperience.sessionManager.onXRSessionInit.add(() => {
            xrHelper.baseExperience.featuresManager.enableFeature(BABYLON.WebXRFeatureName.LAYERS, "latest", {
                preferMultiviewOnInit: true,
            });
            xrHelper.baseExperience.featuresManager.enableFeature(BABYLON.WebXRFeatureName.SPACE_WARP);
        });

        // TODO: How to dynamically enable/disable Space Warp?

        let time = 0;
        scene.registerBeforeRender(() => {
            time += engine.getDeltaTime();
            cubeGrid.position.y = -1 * Math.abs(Math.sin(time / 2000) * 0.5);
            spinningCubes.rotation.y = -time / 2000 / 3;
        });

        return scene;
    }
}

(async function() {
    const scene = await Playground.CreateScene(engine, canvas);

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
})();
