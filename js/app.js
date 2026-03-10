import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { initScene } from './sceneSetup.js';
import { handleInteraction } from './interact.js';
import { handleHover } from './interact.js';
import { Factory } from './objects.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const { scene, camera, renderer } = initScene();

renderer.xr.addEventListener('sessionstart', () => {
    const uiBox = document.querySelector('.interface-box');
    if (uiBox) uiBox.style.display = 'none';
    
    document.body.style.background = 'transparent';
    document.body.style.backgroundImage = 'none';

    renderer.domElement.style.opacity = '1';
});

renderer.xr.addEventListener('sessionend', () => {
    // 1. Fai ricomparire l'interfaccia HTML
    const uiBox = document.querySelector('.interface-box');
    if (uiBox) uiBox.style.display = 'flex';
    
    document.body.style.backgroundColor = 'var(--bg-color)';
    document.body.style.backgroundImage = 'radial-gradient(circle at center, rgba(157, 0, 255, 0.05) 0%, transparent 70%)';

    renderer.domElement.style.opacity = '0.15';
});

document.querySelector('.interface-box').appendChild(ARButton.createButton(renderer, { optionalFeatures: ['hand-tracking'] }));

const activeObjects = [];
window.activeObjects = activeObjects;

const clock = new THREE.Clock();
const mixers = [];
window.mixers = mixers;

function removeObject(obj) {
    if (!obj) return;

    obj.userData.isActionButton = false;
    obj.userData.isAnchor = false;
    if (controllers.left.grabbedObject === obj) controllers.left.grabbedObject = null;
    if (controllers.right.grabbedObject === obj) controllers.right.grabbedObject = null;

    const index = activeObjects.indexOf(obj);
    if (index > -1) activeObjects.splice(index, 1);

    scene.remove(obj);

    saveToMemory();
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
            if (item.type !== 'url_model') {
                spawnObject(item.type, item.params, new THREE.Vector3().fromArray(item.pos));
            }
        });
    }
}
async function spawnObject(type, params, position = null) {
    const obj = await Factory.create(type, params);
    
    if (obj) {
        if (position) obj.position.copy(position);
        else {
            const targetPos = new THREE.Vector3(0, -0.4, -0.6).applyMatrix4(camera.matrixWorld);
            obj.position.copy(targetPos);
        }
        
        scene.add(obj);
        activeObjects.push(obj);
        saveToMemory();
    }
}

function loadGLBFromUrl(url, index = 0, total = 1, customPos = null, customScale = null, animIndex = null) {
    const loader = new GLTFLoader();
    
    loader.load(url, (gltf) => {
        const model = gltf.scene;

        if (customScale) {
            model.scale.set(customScale[0], customScale[1], customScale[2]);
            model.updateMatrixWorld(true);
        }

        if (gltf.animations && gltf.animations.length > 0) {
            if (!window.mixers) window.mixers = [];
            
            const mixer = new THREE.AnimationMixer(model);
            window.mixers.push(mixer);
            
            const clipToPlay = (animIndex !== null && gltf.animations[animIndex]) ? gltf.animations[animIndex] : gltf.animations[0];
            
            if (clipToPlay) {
                mixer.clipAction(clipToPlay).play();
            }
        }

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.sub(center);

        const hitBoxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false, wireframe: true }); 
        const anchorMesh = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);

        anchorMesh.userData.isAnchor = true;
        anchorMesh.userData.type = 'url_model'; 
        anchorMesh.userData.params = { url: url, pos: customPos, scale: customScale };

        anchorMesh.add(model);

        if (customPos) {
            const targetPos = new THREE.Vector3(customPos[0], customPos[1], customPos[2]).applyMatrix4(camera.matrixWorld);
            anchorMesh.position.copy(targetPos);
        } else {
            const offsetX = (index * 0.4) - ((total - 1) * 0.2);
            const targetPos = new THREE.Vector3(offsetX, 0, -0.6).applyMatrix4(camera.matrixWorld);
            anchorMesh.position.copy(targetPos);
        }

        scene.add(anchorMesh);
        activeObjects.push(anchorMesh);
        
        saveToMemory(); 
        
    }, undefined, (error) => {
        console.error('Errore nel caricamento del modello da URL:', error);
    });
}

window.spawnObject = spawnObject;
window.removeObject = removeObject;

localStorage.removeItem('ar_memory'); 
loadFromMemory();
spawnObject('controlPanel', {}); 

const urlParams = new URLSearchParams(window.location.search);
const modelUrls = urlParams.getAll('model');
const modelPos = urlParams.getAll('pos');
const modelScale = urlParams.getAll('scale');
const modelAnim = urlParams.getAll('anim'); // Estrai i parametri anim

if (modelUrls.length > 0) {
    modelUrls.forEach((url, index) => {
        
        let posArray = null;
        if (modelPos[index]) {
            const parts = modelPos[index].split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 3 && !parts.includes(NaN)) posArray = parts;
        }
        
        let scaleArray = null;
        if (modelScale[index]) {
            const parts = modelScale[index].split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 1 && !isNaN(parts[0])) {
                scaleArray = [parts[0], parts[0], parts[0]];
            } else if (parts.length === 3 && !parts.includes(NaN)) {
                scaleArray = parts;
            }
        }

        // Estrai l'indice dell'animazione
        let animIndex = null;
        if (modelAnim[index]) {
            animIndex = parseInt(modelAnim[index].trim(), 10);
        }

        loadGLBFromUrl(url, index, modelUrls.length, posArray, scaleArray, animIndex);
    });
} else {
    loadFromMemory();
}

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
    
    const delta = clock.getDelta();
    mixers.forEach(mixer => mixer.update(delta));

    const objectsToUpdate = activeObjects.filter(obj => obj && obj.parent);

    objectsToUpdate.forEach(obj => {
        const isGrabbed = (controllers.left.grabbedObject === obj || 
                           controllers.right.grabbedObject === obj);

        if (obj.userData.isFollower && !obj.userData.isLocked && !isGrabbed) {
            const targetPos = new THREE.Vector3(0, 0, -0.45).applyMatrix4(camera.matrixWorld);
            obj.position.lerp(targetPos, 0.1);
        }

        if (obj.userData.isBillboard && !isGrabbed) {
            obj.lookAt(camera.position);
        }
    });

    if (scene) {
        handleHover(controllers.left, objectsToUpdate);
        handleHover(controllers.right, objectsToUpdate);
        
        handleInteraction(controllers.left, objectsToUpdate, saveToMemory);
        handleInteraction(controllers.right, objectsToUpdate, saveToMemory);
    }
    
    renderer.render(scene, camera);
});