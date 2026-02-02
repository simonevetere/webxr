import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachControls } from './factory.js';

export async function create(params = {}) {
    const loader = new GLTFLoader();
    const modelUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Flower/Flower.glb';
    
    // 1. Carichiamo il modello
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene;
    
    model.scale.set(0.5, 0.5, 0.5); 

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    model.position.sub(center); 

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({ 
        transparent: true, 
        opacity: 0,
    });
    
    const containerBox = new THREE.Mesh(geometry, material);

    containerBox.add(model);

    containerBox.userData = {
        type: 'sunflower',
        params: params,
        isAnchor: true,      
        isFollower: false,   
        isLocked: false
    };

    attachControls(containerBox, size.x, size.y);

    return containerBox;
}