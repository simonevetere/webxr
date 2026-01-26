import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { initScene } from './sceneSetup.js';
import { handleInteraction } from './interact.js';
import { handleHover } from './interact.js';
import { Factory } from './objects.js';

const { scene, camera, renderer } = initScene();
document.body.appendChild(ARButton.createButton(renderer, { optionalFeatures: ['hand-tracking'] }));

const activeObjects = [];

function removeObject(obj) {
    if (!obj) return;

    if (controllers.left.grabbedObject === obj) controllers.left.grabbedObject = null;
    if (controllers.right.grabbedObject === obj) controllers.right.grabbedObject = null;

    const index = activeObjects.indexOf(obj);
    if (index > -1) activeObjects.splice(index, 1);

    obj.traverse((child) => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (child.material.isMaterial) {
                cleanMaterial(child.material);
            } else if (Array.isArray(child.material)) {
                child.material.forEach(cleanMaterial);
            }
        }
    });

    scene.remove(obj);

    saveToMemory();
}

function cleanMaterial(material) {
    material.dispose(); // Svuota il materiale
    for (const key of Object.keys(material)) {
        if (material[key] && material[key].isTexture) {
            material[key].dispose(); // Svuota la texture (SVG/PNG) dalla GPU
        }
    }
}

function saveToMemory() {
    const data = activeObjects.map(obj => ({
        type: obj.userData.type,
        params: obj.userData.params,
        pos: obj.position.toArray()
    }));
    localStorage.setItem('ar_memory', JSON.stringify(data));
}

function loadFromMemory() {
    const saved = localStorage.getItem('ar_memory');
    if (saved) {
        const data = JSON.parse(saved);
        data.forEach(item => {
            spawnObject(item.type, item.params, new THREE.Vector3().fromArray(item.pos));
        });
    } else {
        spawnObject('controlPanel', { texture: './texture/image/polipo.png' });
    }
}

async function spawnObject(type, params, position = null) {
    const obj = await Factory.create(type, params);
    
    if (obj) {
        if (position) obj.position.copy(position);
        else {
            const targetPos = new THREE.Vector3(0, 0, -0.6).applyMatrix4(camera.matrixWorld);
            obj.position.copy(targetPos);
        }
        
        scene.add(obj);
        activeObjects.push(obj);
        saveToMemory();
    }
}

window.spawnObject = spawnObject;
window.removeObject = removeObject;

loadFromMemory();

const handModels = new XRHandModelFactory();
const controllers = {
    left: { hand: renderer.xr.getHand(0), grabbedObject: null, lastPinch: false },
    right: { hand: renderer.xr.getHand(1), grabbedObject: null, lastPinch: false }
};

Object.values(controllers).forEach(c => {
    c.hand.add(handModels.createHandModel(c.hand, 'mesh'));
    scene.add(c.hand);
});

renderer.setAnimationLoop(() => {
    activeObjects.forEach(obj => {
        const isGrabbed = (controllers.left.grabbedObject === obj || 
                           controllers.right.grabbedObject === obj);

        if (obj.userData.isFollower && !obj.userData.isLocked && !isGrabbed) {
            const targetPos = new THREE.Vector3(0, 0, -0.45).applyMatrix4(camera.matrixWorld);
            obj.position.lerp(targetPos, 0.1);
            
            if (obj.userData.isBillboard) {
                obj.lookAt(camera.position);
            }
        }
    });

    handleHover(controllers.left, scene);
    handleHover(controllers.right, scene);
    
    handleInteraction(controllers.left, scene, saveToMemory);
    handleInteraction(controllers.right, scene, saveToMemory);
    
    renderer.render(scene, camera);
});