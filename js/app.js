import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { initScene } from './sceneSetup.js';
import { handleInteraction } from './interact.js';
import { handleHover } from './interact.js';
import { Factory } from './objects.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const { scene, camera, renderer } = initScene();

// =========================================================
// EVENTI AR SESSION E GESTIONE UI 
// =========================================================
const arOverlay = document.getElementById('ar-overlay');

renderer.xr.addEventListener('sessionstart', async () => {
    const uiBox = document.querySelector('.interface-box');
    if (uiBox) uiBox.style.display = 'none';
    document.body.style.background = 'transparent';
    document.body.style.backgroundImage = 'none';
    renderer.domElement.style.opacity = '1';

    const session = renderer.xr.getSession();
    try {
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
        console.warn("Hit Test non supportato su questo dispositivo", e);
    }

    if (arOverlay) arOverlay.style.display = 'block';
});

renderer.xr.addEventListener('sessionend', () => {
    const uiBox = document.querySelector('.interface-box');
    if (uiBox) uiBox.style.display = 'flex';
    
    document.body.style.backgroundColor = 'var(--bg-color)';
    document.body.style.backgroundImage = 'radial-gradient(circle at center, rgba(157, 0, 255, 0.05) 0%, transparent 70%)';

    renderer.domElement.style.opacity = '0.15';
    
    if (arOverlay) arOverlay.style.display = 'none';
    hitTestSourceRequested = false;
    hitTestSource = null;
});

// =========================================================
// SETUP BOTTONE AR (Con Hit-Test e Overlay)
// =========================================================
const arBtn = ARButton.createButton(renderer, { 
    requiredFeatures: ['hit-test'], 
    optionalFeatures: ['dom-overlay', 'hand-tracking'],
    domOverlay: { root: arOverlay } 
});
document.querySelector('.interface-box').appendChild(arBtn);

// =========================================================
// HIT TEST & MIRINO RETICOLO
// =========================================================
let hitTestSource = null;
let hitTestSourceRequested = false;
window.isRepositioning = false; 

const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

const controller = renderer.xr.getController(0);
scene.add(controller);

controller.addEventListener('select', () => {
    if (window.isRepositioning && reticle.visible) {
        
        window.activeObjects.forEach(obj => {
            if(obj.userData.type === 'url_model' || obj.userData.isAnchor) {
                obj.position.setFromMatrixPosition(reticle.matrix);
                if(obj.userData.type === 'url_model') obj.position.y += 0.05;
            }
        });

        window.isRepositioning = false;
        reticle.visible = false;
        
        const btnRepo = document.getElementById('m-btn-repo');
        if(btnRepo){
            btnRepo.style.background = 'var(--neon-purple)';
            btnRepo.innerText = '📍 RIPOSIZIONA SUL TAVOLO';
        }
    }
});

// =========================================================
// BOTTONI UI MOBILE 2D (Listener Eventi)
// =========================================================
if(document.getElementById('m-btn-play')) {
    let isMobilePlaying = true;
    document.getElementById('m-btn-play').addEventListener('click', (e) => {
        e.stopPropagation(); 
        isMobilePlaying = !isMobilePlaying;
        e.target.style.background = isMobilePlaying ? '#00aa00' : '#aa0000';
        e.target.innerText = isMobilePlaying ? 'PLAY' : 'STOP';
        if (window.mixers) window.mixers.forEach(m => m.timeScale = isMobilePlaying ? 1 : 0);
    });

    document.getElementById('m-btn-zoom-in').addEventListener('click', (e) => {
        e.stopPropagation();
        window.activeObjects.forEach(obj => {
            if (obj.userData.type === 'url_model') {
                obj.scale.multiplyScalar(1.2);
                obj.userData.baseScale = obj.scale.clone();
                obj.updateMatrixWorld(true);
            }
        });
    });

    document.getElementById('m-btn-zoom-out').addEventListener('click', (e) => {
        e.stopPropagation();
        window.activeObjects.forEach(obj => {
            if (obj.userData.type === 'url_model') {
                obj.scale.multiplyScalar(0.8);
                obj.userData.baseScale = obj.scale.clone();
                obj.updateMatrixWorld(true);
            }
        });
    });

    document.getElementById('m-btn-repo').addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (!window.isRepositioning) {
            window.isRepositioning = true; 
            e.target.style.background = '#ffaa00';
            e.target.innerText = '✅';
        } else {
            if (reticle && reticle.visible) {
                window.activeObjects.forEach(obj => {
                    if(obj.userData.type === 'url_model' || obj.userData.isAnchor) {
                        obj.position.setFromMatrixPosition(reticle.matrix);
                        if(obj.userData.type === 'url_model') obj.position.y += 0.05;
                    }
                });
            }

            window.isRepositioning = false;
            reticle.visible = false;
            e.target.style.background = 'var(--neon-purple)';
            e.target.innerText = '📍';
        }
    });

    document.getElementById('m-btn-close').addEventListener('click', (e) => {
        e.stopPropagation();
        window.history.back();
    });
}

// =========================================================
// GLOBALI E GESTIONE MEMORIA
// =========================================================
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

// =========================================================
// CARICAMENTO DA URL
// =========================================================
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
        
        // Salviamo la scala di base per l'effetto hover e lo zoom!
        anchorMesh.userData.baseScale = anchorMesh.scale.clone();
        
        saveToMemory(); 
        
    }, undefined, (error) => {
        console.error('Errore nel caricamento del modello da URL:', error);
    });
}

// =========================================================
// INIT APPLICAZIONE
// =========================================================
window.spawnObject = spawnObject;
window.removeObject = removeObject;

localStorage.removeItem('ar_memory'); 
loadFromMemory();
spawnObject('controlPanel', {}); 

const urlParams = new URLSearchParams(window.location.search);
const modelUrls = urlParams.getAll('model');
const modelPos = urlParams.getAll('pos');
const modelScale = urlParams.getAll('scale');
const modelAnim = urlParams.getAll('anim'); 

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

        let animIndex = null;
        if (modelAnim[index]) {
            animIndex = parseInt(modelAnim[index].trim(), 10);
        }

        loadGLBFromUrl(url, index, modelUrls.length, posArray, scaleArray, animIndex);
    });
} else {
    loadFromMemory();
}

// =========================================================
// MANI E CONTROLLER
// =========================================================
const handModels = new XRHandModelFactory();
const controllers = {
    left: { hand: renderer.xr.getHand(0), grabbedObject: null, lastPinch: false },
    right: { hand: renderer.xr.getHand(1), grabbedObject: null, lastPinch: false }
};

Object.values(controllers).forEach(c => {
    c.hand.add(handModels.createHandModel(c.hand, 'mesh'));
    scene.add(c.hand);
});

// =========================================================
// LOOP DI ANIMAZIONE (Il Cervello Pulito)
// =========================================================
renderer.setAnimationLoop((timestamp, frame) => {
    
    // 1. MOTORE HIT-TEST PER I TAVOLI (Ora è super leggero e stabile)
    if (frame && window.isRepositioning && hitTestSource) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
        } else {
            reticle.visible = false;
        }
    } else if (reticle) {
        reticle.visible = false;
    }

    // 2. AGGIORNAMENTO MIXER (Animazioni GLB)
    const delta = clock.getDelta();
    mixers.forEach(mixer => mixer.update(delta));

    // 3. LOGICA DI MOVIMENTO OGGETTI (Follower / Billboard)
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

    // 4. INTERAZIONI DELLE MANI
    if (scene) {
        handleHover(controllers.left, objectsToUpdate);
        handleHover(controllers.right, objectsToUpdate);
        
        handleInteraction(controllers.left, objectsToUpdate, saveToMemory);
        handleInteraction(controllers.right, objectsToUpdate, saveToMemory);
    }
    
    renderer.render(scene, camera);
});