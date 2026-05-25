import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RotateCw, ZoomIn, Hand } from 'lucide-react';
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

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
    // Remove grid on mobile for cleaner look
    // const grid = new THREE.GridHelper(20, 40, 0x1a2030, 0x1a2030);
    // scene.add(grid);

    // Default placeholder sphere - more interesting than cube
    const geom = new THREE.IcosahedronGeometry(0.8, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.4,
      roughness: 0.3,
      wireframe: false,
      flatShading: true
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    scene.add(mesh);
    modelRef.current = mesh;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      if (!modelUrl && modelRef.current) {
        modelRef.current.rotation.y += 0.005;
      }
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
      container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    const scene = sceneRef.current;

    setLoading(true);
    setError('');

    // Remove old model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    const ext = format?.toLowerCase() || modelUrl.split('.').pop()?.toLowerCase() || 'glb';

    const onLoaded = (obj: THREE.Object3D) => {
      // Center and scale
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
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => onLoaded(gltf.scene), undefined, (e) => {
        setError(String(e));
        setLoading(false);
      });
    } else if (ext === 'obj') {
      const loader = new OBJLoader();
      loader.load(modelUrl, onLoaded, undefined, (e) => {
        setError(String(e));
        setLoading(false);
      });
    } else if (ext === 'stl') {
      const loader = new STLLoader();
      loader.load(modelUrl, (geometry) => {
        const mat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.3, roughness: 0.5 });
        const mesh = new THREE.Mesh(geometry, mat);
        onLoaded(mesh);
      }, undefined, (e) => {
        setError(String(e));
        setLoading(false);
      });
    } else {
      setError('Unsupported format for preview');
      setLoading(false);
    }
  }, [modelUrl, format]);

  const resetCamera = useCallback(() => {
    cameraRef.current?.position.set(3, 2, 3);
    controlsRef.current?.reset();
  }, []);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden touch-pan-x touch-pan-y">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-md z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-gray-300 text-sm font-medium">{t.studio.viewer.loading}</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-md z-10">
          <div className="text-center px-6 max-w-xs">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Hand className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Mobile touch hint */}
      {!loading && !error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full z-10">
          <Hand className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400 text-xs">{t.studio.viewer.rotate}</span>
        </div>
      )}

      {/* Floating toolbar - desktop only */}
      <div className="hidden lg:flex absolute top-4 right-4 flex-col gap-2 z-10">
        <button
          onClick={resetCamera}
          className="w-10 h-10 bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all active:scale-95"
          title="Reset camera"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          className="w-10 h-10 bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all active:scale-95"
          title="Zoom fit"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
