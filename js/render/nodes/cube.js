import * as THREE from 'three';

export function createTexturedCube(texturePath) {
  // 1. Il Loader di Three.js gestisce TUTTO (NPOT, flipY, placeholder)
  const loader = new THREE.TextureLoader();
  const texture = loader.load(texturePath);

  // 2. Geometria e Materiale (Unlit = MeshBasicMaterial)
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const material = new THREE.MeshBasicMaterial({ map: texture });

  // 3. Crea la Mesh
  const cube = new THREE.Mesh(geometry, material);
  return cube;
}