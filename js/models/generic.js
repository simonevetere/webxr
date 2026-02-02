import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachControls } from './factory.js';

export async function create(params = {}) {
    const modelUrl = params.url;
    if (!modelUrl) {
        console.error("Generic.js: URL mancante nei parametri!");
        return null;
    }

    const loader = new GLTFLoader();
    
    try {
        const gltf = await loader.loadAsync(modelUrl);
        const model = gltf.scene;

        const s = params.scale || 1.0;
        model.scale.set(s, s, s);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        model.position.sub(center);

        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshStandardMaterial({ 
            transparent: true, 
            opacity: 0 
        });
        const containerBox = new THREE.Mesh(geometry, material);
        containerBox.add(model);

        containerBox.userData = {
            type: params.type || 'generic_object', 
            params: params,
            isAnchor: params.isAnchor ?? true,
            isFollower: params.isFollower ?? false,
            isLocked: params.isLocked ?? false,
            isBillboard: params.isBillboard ?? false
        };

        attachControls(containerBox, size.x, size.y);

        return containerBox;

    } catch (error) {
        console.error("Generic.js: Errore nel caricamento del GLB", error);
        return null;
    }
}