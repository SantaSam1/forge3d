import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RotateCw, Maximize2, Minimize2 } from 'lucide-react';
import { useLang } from '../lib/i18n';

interface Viewer3DProps {
  modelUrl?: string;
  format?: string;
}

export default function Viewer3D({ modelUrl, format }: Viewer3DProps) {
  const { t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);
    scene.fog = new THREE.FogExp2(0x0f1117, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.01, 1000);
    camera.position.set(3, 2, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controls.enablePan = true;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x4dd9f5, 0.5);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x60a5fa, 0.8, 20);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Grid
    scene.add(new THREE.GridHelper(20, 40, 0x1a2030, 0x1a2030));

    // Placeholder cube
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.5, roughness: 0.3 })
    );
    cube.castShadow = true;
    scene.add(cube);
    modelRef.current = cube;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      if (!modelUrl && modelRef.current) modelRef.current.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();
    animFrameRef.current = frameId!;

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    const scene = sceneRef.current;
    setLoading(true);
    setError('');

    if (modelRef.current) { scene.remove(modelRef.current); modelRef.current = null; }

    const ext = format?.toLowerCase() || 'glb';

    const onLoaded = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDim;
      obj.position.sub(center.multiplyScalar(scale));
      obj.scale.setScalar(scale);
      obj.castShadow = true;
      scene.add(obj);
      modelRef.current = obj;
      cameraRef.current!.position.set(4, 3, 4);
      controlsRef.current!.reset();
      setLoading(false);
    };

    if (ext === 'glb' || ext === 'gltf') {
      new GLTFLoader().load(modelUrl, gltf => onLoaded(gltf.scene), undefined, e => { setError(String(e)); setLoading(false); });
    } else if (ext === 'obj') {
      new OBJLoader().load(modelUrl, onLoaded, undefined, e => { setError(String(e)); setLoading(false); });
    } else if (ext === 'stl') {
      new STLLoader().load(modelUrl, geometry => {
        onLoaded(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.3, roughness: 0.5 })));
      }, undefined, e => { setError(String(e)); setLoading(false); });
    } else {
      setError('Unsupported format');
      setLoading(false);
    }
  }, [modelUrl, format]);

  const resetCamera = useCallback(() => {
    cameraRef.current?.position.set(3, 2, 3);
    controlsRef.current?.reset();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300 text-sm">{t.studio.viewer.loading}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <p className="text-red-400 text-sm px-4 text-center">{error}</p>
        </div>
      )}

      {/* Toolbar — only Reset and Fullscreen, both working */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button onClick={resetCamera}
          className="w-8 h-8 bg-gray-800/80 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          title="Reset camera">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button onClick={toggleFullscreen}
          className="w-8 h-8 bg-gray-800/80 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
