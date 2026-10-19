import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

type Inputs = { progress: { current: number }; pointer: { current: { x: number; y: number } }; reduced: boolean };

/** An illustrative plastic BGA package, with an actual ball grid underneath. */
export function createChipScene(host: HTMLElement, inputs: Inputs) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, host.clientWidth < 820 ? 1.5 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f4f5f6");
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const textures = new Set<THREE.Texture>();
  let destroyed = false, dirty = true;

  // Studio softboxes give the solder broad, restrained reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene(); room.background = new THREE.Color(0x494e54);
  const softboxes: THREE.Mesh[] = [];
  for (const [x, y, z, w, h, strength] of [[-6, 7, 3, 6, 7, 3], [4, 8, 5, 7, 4, 3.5], [5, 1, -6, 3, 7, 2], [-3, -5, 2, 5, 5, 1.8]]) {
    const box = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(strength), side: THREE.DoubleSide }));
    box.position.set(x, y, z); box.lookAt(0, 0, 0); room.add(box); softboxes.push(box);
  }
  const environment = pmrem.fromScene(room, 0.05);
  scene.environment = environment.texture; scene.environmentIntensity = 0.85;
  softboxes.forEach((box) => { box.geometry.dispose(); (box.material as THREE.Material).dispose(); }); pmrem.dispose();
  RectAreaLightUniformsLib.init();
  const key = new THREE.RectAreaLight(0xffffff, 5, 8, 6);
  key.position.set(-3, 8, 5); key.lookAt(0, 0, 0); scene.add(key);
  const rim = new THREE.RectAreaLight(0xe4eaf1, 3.5, 2, 7);
  rim.position.set(5, 4, -4); rim.lookAt(0, 0, 0); scene.add(rim);
  const underside = new THREE.RectAreaLight(0xffffff, 2.8, 6, 6);
  underside.position.set(0, -5, 5); underside.lookAt(0, 0, 0); scene.add(underside);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x606b76, 1));

  const grainCanvas = document.createElement("canvas"); grainCanvas.width = grainCanvas.height = 256;
  const gc = grainCanvas.getContext("2d")!, pixels = gc.createImageData(256, 256);
  let seed = 937;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = 105 + Math.floor(random() * 80);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  gc.putImageData(pixels, 0, 0);
  const grain = new THREE.CanvasTexture(grainCanvas); textures.add(grain);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(6, 6);
  const epoxy = new THREE.MeshPhysicalMaterial({ color: 0x171a1e, metalness: 0, roughness: 0.61, bumpMap: grain, bumpScale: 0.003, clearcoat: 0.06, clearcoatRoughness: 0.65 });
  const laminate = new THREE.MeshStandardMaterial({ color: 0x183e35, metalness: 0.08, roughness: 0.63 });
  const laminateEdge = new THREE.MeshStandardMaterial({ color: 0x567162, metalness: 0.05, roughness: 0.64 });
  const solder = new THREE.MeshPhysicalMaterial({ color: 0xc6ccd2, metalness: 1, roughness: 0.25, envMapIntensity: 1.15 });
  const padsMaterial = new THREE.MeshStandardMaterial({ color: 0x9e8d61, metalness: 0.8, roughness: 0.44 });
  const chip = new THREE.Group(); scene.add(chip);
  chip.add(new THREE.Mesh(new RoundedBoxGeometry(4.18, 0.13, 4.18, 3, 0.035), laminate));
  const edge = new THREE.Mesh(new RoundedBoxGeometry(4.17, 0.018, 4.17, 2, 0.025), laminateEdge);
  edge.position.y = 0.015; chip.add(edge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.98, 0.46, 3.98, 5, 0.065), epoxy);
  lid.position.y = 0.29; chip.add(lid);
  const seam = new THREE.Mesh(new RoundedBoxGeometry(4.02, 0.027, 4.02, 2, 0.025), new THREE.MeshStandardMaterial({ color: 0x101615, roughness: 0.72 }));
  seam.position.y = 0.085; chip.add(seam);

  // Balls and lands stay within the substrate perimeter. No side leads.
  const count = 17, pitch = 0.224;
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.089, 20, 12), solder, count * count);
  const pads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.098, 0.098, 0.008, 16), padsMaterial, count * count);
  const dummy = new THREE.Object3D();
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    const index = row * count + col, x = (col - 8) * pitch, z = (row - 8) * pitch;
    dummy.position.set(x, -0.14, z); dummy.scale.set(1, 0.9, 1); dummy.updateMatrix(); balls.setMatrixAt(index, dummy.matrix);
    dummy.position.y = -0.067; dummy.scale.setScalar(1); dummy.updateMatrix(); pads.setMatrixAt(index, dummy.matrix);
  }
  chip.add(pads, balls);
  const pinOne = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.003, 28), new THREE.MeshStandardMaterial({ color: 0x41474c, roughness: 0.8 }));
  pinOne.position.set(-1.58, 0.522, 1.58); chip.add(pinOne);

  // Existing NXP brand asset, rendered in laser-grey on the illustrative package.
  // Omit specific part numbers, date codes, and traceability claims.
  const markCanvas = document.createElement("canvas"); markCanvas.width = markCanvas.height = 1024;
  const mc = markCanvas.getContext("2d")!;
  mc.fillStyle = "#858a8f"; mc.font = "500 35px Arial, sans-serif"; mc.fillText("BGA", 115, 575);
  mc.fillStyle = "#656c72"; mc.font = "21px Arial, sans-serif"; mc.fillText("COMPONENTS", 115, 624);
  const markTexture = new THREE.CanvasTexture(markCanvas); markTexture.colorSpace = THREE.SRGBColorSpace; textures.add(markTexture);
  markTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshStandardMaterial({ map: markTexture, transparent: true, roughness: 0.8, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  mark.rotation.x = -Math.PI / 2; mark.position.y = 0.522; chip.add(mark);
  const logo = new Image();
  logo.onload = () => {
    if (destroyed) return;
    const logoCanvas = document.createElement("canvas"); logoCanvas.width = 512; logoCanvas.height = 175;
    const lc = logoCanvas.getContext("2d")!;
    lc.drawImage(logo, 0, 0, 512, 175); lc.globalCompositeOperation = "source-in"; lc.fillStyle = "#969b9f"; lc.fillRect(0, 0, 512, 175);
    mc.drawImage(logoCanvas, 112, 295, 430, 147); markTexture.needsUpdate = true; dirty = true; host.dataset.brand = "ready";
  };
  logo.src = "/brands/nxp.svg";

  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext("2d")!, gradient = sc.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(53,65,77,.16)"); gradient.addColorStop(0.35, "rgba(53,65,77,.09)"); gradient.addColorStop(1, "rgba(53,65,77,0)");
  sc.fillStyle = gradient; sc.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas); textures.add(shadowTexture);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 6), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.25; scene.add(shadow);

  let currentProgress = 0, px = 0, py = 0, frame = 0, visible = true, last = performance.now();
  const started = last;
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const narrow = w < 820;
    renderer.setSize(w, h); camera.aspect = w / h; camera.fov = narrow ? 37 : 32;
    camera.setViewOffset(w, h, narrow ? 0 : -w * 0.245, narrow ? h * 0.245 : -h * 0.01, w, h);
    camera.position.set(narrow ? 8.6 : 6.6, narrow ? 10.9 : 8.4, narrow ? 15.2 : 11.9);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); dirty = true;
  };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "120px" }); observer.observe(host);
  const contextLost = (event: Event) => {
    event.preventDefault(); visible = false;
    host.dispatchEvent(new CustomEvent("chip-scene-unavailable", { bubbles: true }));
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost); resize();
  const render = () => {
    if (destroyed) return;
    frame = requestAnimationFrame(render);
    const now = performance.now(), delta = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || document.hidden || (inputs.reduced && !dirty)) return;
    dirty = false;
    const damping = 1 - Math.exp(-delta * 6);
    currentProgress += (inputs.progress.current - currentProgress) * damping;
    px += (inputs.pointer.current.x - px) * damping; py += (inputs.pointer.current.y - py) * damping;
    const p = inputs.reduced ? 0 : THREE.MathUtils.clamp(currentProgress, 0, 1);
    const reveal = THREE.MathUtils.smoothstep(p, 0.08, 0.78), exit = THREE.MathUtils.smoothstep(p, 0.82, 1);
    const intro = inputs.reduced ? 0 : Math.pow(Math.max(0, 1 - (now - started) / 800), 3);
    chip.rotation.set(-reveal * 1.95 + py * 0.065 + intro * 0.1, -0.14 + reveal * 0.3 + px * 0.075, -0.1 + reveal * 0.08);
    chip.position.set(exit * 0.8, intro * -0.16 + exit * 0.35, 0);
    chip.scale.setScalar((1 - intro * 0.035) * (1 - exit * 0.065)); shadowMaterial.opacity = 1 - reveal * 0.45;
    renderer.render(scene, camera); host.dataset.progress = p.toFixed(3); host.dataset.scene = "ready";
  };
  render();
  return () => {
    destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect();
    logo.onload = null; logo.onerror = null; logo.removeAttribute("src");
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        }
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
    });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose()); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
