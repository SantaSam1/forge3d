import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Экспортирует THREE.Object3D (Mesh или Group) в GLB и возвращает blob: URL.
 * Это позволяет параметрическим моделям (шестерни, валы, втулки, пластины)
 * "прикинуться" обычной сгенерированной/загруженной моделью для существующего
 * Viewer3D и StudioExport — они оба просто принимают modelUrl, ничего не зная
 * о том, как эта модель была создана.
 */
export function exportObjectToGlbUrl(object: THREE.Object3D): Promise<string> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (result) => {
        const blob = result instanceof ArrayBuffer
          ? new Blob([result], { type: 'model/gltf-binary' })
          : new Blob([JSON.stringify(result)], { type: 'application/json' });
        resolve(URL.createObjectURL(blob));
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

/** Освобождает память: убирает геометрию/материалы у объекта перед его выбрасыванием. */
export function disposeObject(object: THREE.Object3D | null) {
  if (!object) return;
  object.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}
