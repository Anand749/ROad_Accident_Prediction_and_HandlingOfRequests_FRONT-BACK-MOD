import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing';
import './Hyperspeed.css';

/* ── Theme-matched default options ──────────────────────────── */
const DEFAULT_OPTIONS = {
    onSpeedUp: () => { },
    onSlowDown: () => { },
    distortion: 'turbulentDistortion',
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 4,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],
    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],
    carLightsLength: [400 * 0.03, 400 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],
    colors: {
        roadColor: 0x080808,
        islandColor: 0x0a0a0a,
        background: 0x000000,
        shoulderLines: 0x131318,
        brokenLines: 0x131318,
        leftCars: [0xff2d55, 0xc2244a, 0xff5577],   // accentRed tones
        rightCars: [0x00d4ff, 0x0ea5e9, 0x38bdf8],   // accentBlue tones
        sticks: 0x00d4ff,
    },
};

/* ── Distortion definitions ─────────────────────────────────── */
const nsin = (val) => Math.sin(val) * 0.5 + 0.5;

const turbulentUniforms = {
    uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
    uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
};

const distortions = {
    turbulentDistortion: {
        uniforms: turbulentUniforms,
        getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin(float val){ return sin(val)*0.5+0.5; }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI*progress*uFreq.r+uTime)*uAmp.r +
          pow(cos(PI*progress*uFreq.g+uTime*(uFreq.g/uFreq.r)),2.)*uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin(PI*progress*uFreq.b+uTime)*uAmp.b +
          -pow(nsin(PI*progress*uFreq.a+uTime/(uFreq.b/uFreq.a)),5.)*uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress)-getDistortionX(0.0125),
          getDistortionY(progress)-getDistortionY(0.0125),
          0.
        );
      }
    `,
        getJS: (progress, time) => {
            const uFreq = turbulentUniforms.uFreq.value;
            const uAmp = turbulentUniforms.uAmp.value;
            const getX = (p) =>
                Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
                Math.pow(Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)), 2) * uAmp.y;
            const getY = (p) =>
                -nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
                Math.pow(nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)), 5) * uAmp.w;
            let distortion = new THREE.Vector3(
                getX(progress) - getX(progress + 0.007),
                getY(progress) - getY(progress + 0.007),
                0
            );
            let lookAtAmp = new THREE.Vector3(-2, -5, 0);
            let lookAtOffset = new THREE.Vector3(0, 0, -10);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        },
    },
};

/* ── Helper functions ───────────────────────────────────────── */
function lerp(current, target, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) change = target - current;
    return change;
}
function random(base, r) {
    return base + Math.random() * r;
}

/* ── Road class ─────────────────────────────────────────────── */
class Road {
    constructor(app, options, index) {
        this.app = app;
        this.options = options;
        this.index = index;
        this.leftRoadWay = new RoadWay(app, options, index, -1);
        this.rightRoadWay = new RoadWay(app, options, index, 1);
        this.islandMesh = this.createIsland();
        this.roadMesh = this.createRoad();
    }
    createIsland() {
        const o = this.options;
        const points = [
            new THREE.Vector3(-o.islandWidth / 2 + 0.2, 0, 0),
            new THREE.Vector3(0, 0, o.length),
            new THREE.Vector3(o.islandWidth / 2 - 0.2, 0, 0),
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 50, 0.05, 8, false);
        const material = new THREE.MeshBasicMaterial({ color: o.colors.islandColor, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = this.index * (o.roadWidth + o.islandWidth * 2 + 0.2);
        this.app.scene.add(mesh);
        return mesh;
    }
    createRoad() {
        const o = this.options;
        const geometry = new THREE.PlaneGeometry(o.roadWidth, o.length, 20, 200);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(o.colors.roadColor) },
                uTime: { value: 0 },
                uTravelLength: { value: o.length },
                ...this.app.distortion.uniforms,
            },
            vertexShader: `
        uniform float uTravelLength;
        uniform float uTime;
        ${this.app.distortion.getDistortion}
        void main(){
          vec3 transformed = position.xyz;
          float progress = clamp(transformed.y / uTravelLength, 0., 1.);
          vec3 dist = getDistortion(progress);
          transformed.x += dist.x;
          transformed.z += dist.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        void main(){ gl_FragColor = vec4(uColor, 1.); }
      `,
        });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = this.index * (o.roadWidth + o.islandWidth * 2 + 0.2);
        this.app.scene.add(mesh);
        return mesh;
    }
    update(time) {
        this.roadMesh.material.uniforms.uTime.value = time;
        this.leftRoadWay.update(time);
        this.rightRoadWay.update(time);
    }
}

/* ── RoadWay class ──────────────────────────────────────────── */
class RoadWay {
    constructor(app, options, rIndex, side) {
        this.app = app;
        this.options = options;
        this.rIndex = rIndex;
        this.side = side;
        this.carLights = new CarLights(app, options, rIndex, side);
        this.sticks = new LightSticks(app, options, rIndex);
    }
    update(time) {
        this.carLights.update(time);
        this.sticks.update(time);
    }
}

/* ── CarLights class ────────────────────────────────────────── */
class CarLights {
    constructor(app, options, rIndex, side) {
        this.app = app;
        this.options = options;
        this.rIndex = rIndex;
        this.side = side;
        this.colors = side < 0 ? options.colors.leftCars : options.colors.rightCars;
        this.speed = side < 0 ? options.movingAwaySpeed : options.movingCloserSpeed;
        this.mesh = this.init();
    }
    init() {
        const o = this.options;
        const curve = new THREE.LineCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        );
        const baseGeometry = new THREE.TubeGeometry(curve, 25, 1, 8, false);
        const instanced = new THREE.InstancedBufferGeometry().copy(baseGeometry);
        instanced.instanceCount = o.lightPairsPerRoadWay;

        const aOffset = [];
        const aMetrics = [];
        const aColor = [];

        for (let i = 0; i < o.lightPairsPerRoadWay; i++) {
            const radius = random(o.carLightsRadius[0], o.carLightsRadius[1]);
            const len = random(o.carLightsLength[0], o.carLightsLength[1]);
            const speed = random(this.speed[0], this.speed[1]);
            const carWidth = random(o.carWidthPercentage[0], o.carWidthPercentage[1]);
            const carShiftX = random(o.carShiftX[0], o.carShiftX[1]);
            const offsetY = random(o.carFloorSeparation[0], o.carFloorSeparation[1]);

            aOffset.push(i * 2 * Math.PI / o.lightPairsPerRoadWay);
            aMetrics.push(radius, len, speed);
            aColor.push(...new THREE.Color(this.colors[i % this.colors.length]).toArray());
        }

        instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false));
        instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTravelLength: { value: o.length },
                uFade: { value: o.carLightsFade },
                ...this.app.distortion.uniforms,
            },
            vertexShader: `
        attribute float aOffset;
        attribute vec3 aMetrics;
        attribute vec3 aColor;
        uniform float uTravelLength;
        uniform float uTime;
        uniform float uFade;
        varying vec3 vColor;
        varying float vAlpha;
        ${this.app.distortion.getDistortion}
        void main(){
          vec3 transformed = position.xyz;
          float radius = aMetrics.x;
          float myLength = aMetrics.y;
          float speed = aMetrics.z;
          transformed.xy *= radius;
          transformed.z *= myLength;
          float zOffset = mod(aOffset - uTime * speed, uTravelLength);
          transformed.z += zOffset;
          float progress = clamp(transformed.z / uTravelLength, 0., 1.);
          vec3 dist = getDistortion(progress);
          transformed.x += dist.x;
          transformed.y += dist.y;
          float fadeAlpha = smoothstep(0., uFade, progress) * (1. - smoothstep(1. - uFade, 1., progress));
          vColor = aColor;
          vAlpha = fadeAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
        }
      `,
            fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const mesh = new THREE.Mesh(instanced, material);
        mesh.frustumCulled = false;
        mesh.position.x = this.rIndex * (o.roadWidth + o.islandWidth * 2 + 0.2);
        this.app.scene.add(mesh);
        return mesh;
    }
    update(time) {
        this.mesh.material.uniforms.uTime.value = time;
    }
}

/* ── LightSticks class ──────────────────────────────────────── */
class LightSticks {
    constructor(app, options, rIndex) {
        this.app = app;
        this.options = options;
        this.rIndex = rIndex;
        this.mesh = this.init();
    }
    init() {
        const o = this.options;
        const geometry = new THREE.PlaneGeometry(1, 1);
        const instanced = new THREE.InstancedBufferGeometry().copy(geometry);
        instanced.instanceCount = o.totalSideLightSticks;

        const aOffset = [];
        const aMetrics = [];

        for (let i = 0; i < o.totalSideLightSticks; i++) {
            const width = random(o.lightStickWidth[0], o.lightStickWidth[1]);
            const height = random(o.lightStickHeight[0], o.lightStickHeight[1]);
            aOffset.push(((i / o.totalSideLightSticks) * o.length));
            aMetrics.push(width, height);
        }

        instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTravelLength: { value: o.length },
                uColor: { value: new THREE.Color(o.colors.sticks) },
                uTime: { value: 0 },
                ...this.app.distortion.uniforms,
            },
            vertexShader: `
        attribute float aOffset;
        attribute vec2 aMetrics;
        uniform float uTravelLength;
        uniform float uTime;
        ${this.app.distortion.getDistortion}
        void main(){
          vec3 transformed = position.xyz;
          float width = aMetrics.x;
          float height = aMetrics.y;
          transformed.x *= width;
          transformed.y *= height;
          transformed.y += height / 2.;
          transformed.x += ${o.roadWidth / 2 + o.islandWidth / 2}.;
          float zOffset = mod(aOffset - uTime * 60., uTravelLength);
          transformed.z += zOffset;
          float progress = clamp(transformed.z / uTravelLength, 0., 1.);
          vec3 dist = getDistortion(progress);
          transformed.x += dist.x;
          transformed.y += dist.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        void main(){ gl_FragColor = vec4(uColor, 1.); }
      `,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(instanced, material);
        mesh.frustumCulled = false;
        mesh.position.x = this.rIndex * (o.roadWidth + o.islandWidth * 2 + 0.2);
        this.app.scene.add(mesh);
        return mesh;
    }
    update(time) {
        this.mesh.material.uniforms.uTime.value = time;
    }
}

/* ── App class ──────────────────────────────────────────────── */
class HyperspeedApp {
    constructor(container, options) {
        this.options = options;
        this.container = container;
        this.distortion = distortions[options.distortion] || distortions.turbulentDistortion;

        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(options.colors.background);
        this.camera = new THREE.PerspectiveCamera(
            options.fov,
            container.offsetWidth / container.offsetHeight,
            0.1,
            10000
        );
        this.camera.position.set(0, 8, -5);
        this.camera.lookAt(0, 3, options.length);

        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Post processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloomEffect = new BloomEffect({
            luminanceThreshold: 0.2,
            luminanceSmoothing: 0.025,
            intensity: 1.2,
        });
        const smaaEffect = new SMAAEffect({ preset: SMAAPreset.LOW });
        this.composer.addPass(new EffectPass(this.camera, bloomEffect, smaaEffect));

        this.road = new Road(this, options, 0);
        this.disposed = false;

        this.tick = this.tick.bind(this);
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);
        this.tick();
    }
    tick() {
        if (this.disposed) return;
        this.frameId = requestAnimationFrame(this.tick);
        const time = this.clock.getElapsedTime();
        this.road.update(time);
        this.composer.render();
    }
    onResize() {
        if (this.disposed || !this.container) return;
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
        this.scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                else obj.material.dispose();
            }
        });
    }
}

/* ── React component ────────────────────────────────────────── */
const Hyperspeed = ({ effectOptions = {} }) => {
    const containerRef = useRef(null);
    const appRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const merged = { ...DEFAULT_OPTIONS, ...effectOptions, colors: { ...DEFAULT_OPTIONS.colors, ...effectOptions.colors } };
        appRef.current = new HyperspeedApp(containerRef.current, merged);
        return () => {
            appRef.current?.dispose();
            appRef.current = null;
        };
    }, []);

    return <div id="hyperspeed-container" ref={containerRef} />;
};

export default Hyperspeed;
