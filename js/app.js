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

    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    

    if (arOverlay) arOverlay.style.display = 'block';

    if (isMobileDevice) {
        setTimeout(() => {
            const repoBtn = document.getElementById('m-btn-repo');
            if (repoBtn && !window.isRepositioning) {
                repoBtn.click();
            }
        }, 500);
    }
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

function getSelectedObject() {
    let obj = window.activeObjects[window.selectedObjectIndex];
    if (!obj || obj.userData.type !== 'url_model') {
        obj = window.activeObjects.find(o => o.userData.type === 'url_model');
        if (obj) window.selectedObjectIndex = window.activeObjects.indexOf(obj);
    }
    return obj;
}

window.selectedObjectIndex = 0;

function updateObjectSelectorUI() {
    const container = document.getElementById('object-selector');
    if (!container) return;
    
    container.innerHTML = '';

    window.activeObjects.forEach((obj, index) => {
        if (obj.userData.type === 'url_model') {
            const btn = document.createElement('button');
            
            btn.className = "btn btn-sm " + (window.selectedObjectIndex === index ? "btn-primary" : "btn-dark");
            
            let btnName = obj.userData.id || `Obj ${index + 1}`;
            if (btnName.startsWith('url_model_')) {
                btnName = btnName.replace('url_model_', '');
            }

            btn.innerText = btnName;
            
            btn.style.borderRadius = "20px";
            btn.style.padding = "5px 15px";
            btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.5)";
            btn.style.border = window.selectedObjectIndex === index ? "none" : "1px solid rgba(255,255,255,0.2)";
            btn.style.pointerEvents = "auto";
            btn.style.flexShrink = "0";
            
            btn.onclick = (e) => {
                e.stopPropagation();
                window.selectedObjectIndex = index;
                updateObjectSelectorUI();
            };
            
            container.appendChild(btn);
        }
    });
}
// =========================================================
// BOTTONI UI MOBILE 2D (Listener Eventi)
// =========================================================
if(document.getElementById('m-btn-play')) {
    let isMobilePlaying = true;
    document.getElementById('m-btn-play').addEventListener('click', (e) => {
        e.stopPropagation(); 
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');
        
        isMobilePlaying = !isMobilePlaying;

        if (isMobilePlaying) {
            btn.style.background = '#fff';
            btn.style.color = '#000';
            if (icon) icon.className = 'bi bi-pause-fill';
        } else {
            btn.style.background = '#00aa00';
            btn.style.color = '#fff';
            if (icon) icon.className = 'bi bi-play-fill';
        }

        if (window.mixers) {
            window.mixers.forEach(m => m.timeScale = isMobilePlaying ? 1 : 0);
        }
    });

    document.getElementById('m-btn-zoom-in').addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedObj = getSelectedObject();
        if (selectedObj) {
            selectedObj.scale.multiplyScalar(1.2);
            selectedObj.userData.baseScale = selectedObj.scale.clone();
            selectedObj.updateMatrixWorld(true);
            saveToMemory();
        }
    });

    document.getElementById('m-btn-zoom-out').addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedObj = getSelectedObject();
        if (selectedObj) {
            selectedObj.scale.multiplyScalar(0.8);
            selectedObj.userData.baseScale = selectedObj.scale.clone();
            selectedObj.updateMatrixWorld(true);
            saveToMemory();
        }
    });

    document.getElementById('m-btn-repo').addEventListener('click', function(e) {
        e.stopPropagation();
        const prompt = document.getElementById('ar-prompt');
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');
        
        if (!window.isRepositioning) {
            window.isRepositioning = true; 
            
            btn.style.background = '#ffaa00'; 
            if(icon) {
                icon.classList.remove('bi-arrows-move');
                icon.classList.add('bi-check-lg');
            }
            
            if (prompt) {
                prompt.style.display = 'block';
                prompt.innerText = 'Slowly move your phone to detect the surface.';
                prompt.style.background = 'rgba(0,0,0,0.7)';
                prompt.dataset.found = "false";
            }
        } else {
            if (typeof reticle !== 'undefined' && reticle && reticle.visible) {
                if (prompt) prompt.style.display = 'none';
                const selectedObj = getSelectedObject();
                if (selectedObj) {
                    selectedObj.position.setFromMatrixPosition(reticle.matrix);
                    saveToMemory();
                }
            }

            window.isRepositioning = false;
            if (typeof reticle !== 'undefined') reticle.visible = false;
            
            btn.style.background = 'var(--neon-purple)';
            if(icon) {
                icon.classList.remove('bi-check-lg');
                icon.classList.add('bi-arrows-move');
            }
        }
    });

    document.getElementById('m-btn-rotate').addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        window.isAutoRotating = !window.isAutoRotating;
        btn.style.background = window.isAutoRotating ? '#ffaa00' : 'rgba(0,0,0,0.8)';
    });

    document.getElementById('m-btn-close').addEventListener('click', (e) => {
        e.stopPropagation();
        const session = renderer.xr.getSession();
        if (session) session.end();
        
        window.history.back(); 
    });

    document.getElementById('m-btn-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedObj = getSelectedObject();
        if (selectedObj) {
            removeObject(selectedObj);
            window.selectedObjectIndex = 0; 
            updateObjectSelectorUI();
        }
    });
}

// =========================================================
// GLOBALI E GESTIONE MEMORIA
// =========================================================
const activeObjects = [];
window.activeObjects = activeObjects;
window.isAutoRotating = false;
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
    const validObjects = activeObjects.filter(obj => obj.userData && obj.userData.type);

    const data = validObjects.map(obj => ({
        id: obj.userData.id,
        type: obj.userData.type,
        params: obj.userData.params,
        pos: obj.position.toArray(),
        scale: obj.scale.toArray(),
        rotation: obj.rotation.toArray()
    }));
    
    localStorage.setItem('ar_memory', JSON.stringify(data));
}

function loadFromMemory() {
    const saved = localStorage.getItem('ar_memory');
    if (saved) {
        const data = JSON.parse(saved);
        data.forEach(item => {
            if (item.type === 'controlPanel') {
                const exists = activeObjects.some(o => o.userData.type === 'controlPanel');
                if (exists) return; 
            }
            if (item.type === 'url_model') {
                loadGLBFromUrl(item.params.url, 0, 1, item.pos, item.scale, null, false);
            } else {
                spawnObject(item.type, item.params, new THREE.Vector3().fromArray(item.pos), false);
            }
        });
    }
}

// =========================================================
// SPAWN OGGETTI E AGGIUNTA ID
// =========================================================
async function spawnObject(type, params, position = null, shouldSave = true, customId = null) {
    var obj = await Factory.create(type, params);
    
    if (obj) {
        // ASSEGNA L'ID!
        obj.userData.id = customId || `${type}_${Date.now()}`;

        if (position) obj.position.copy(position);
        else {
            const targetPos = new THREE.Vector3(0, -0.4, -0.6).applyMatrix4(camera.matrixWorld);
            obj.position.copy(targetPos);
        }
        
        scene.add(obj);
        activeObjects.push(obj);
        
        // SALVA SOLO SE AUTORIZZATO!
        if (shouldSave) {
            saveToMemory();
        }
    }
}

// =========================================================
// CARICAMENTO DA URL (Con Normalizzazione in Metri Reali e ID)
// =========================================================
function loadGLBFromUrl(url, index = 0, total = 1, customPos = null, customScale = null, animIndex = null, shouldSave = true, customId = null) {
    const loader = new GLTFLoader();
    
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true); // Aggiorna le matrici per sicurezza

        const boundingBox = new THREE.Box3();
        boundingBox.makeEmpty();
        
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
                const childBox = child.geometry.boundingBox.clone();
                childBox.applyMatrix4(child.matrixWorld);
                boundingBox.union(childBox);
            }
        });

        const initialSize = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);

        if (customScale && maxDim > 0) {
            const targetMeters = customScale[0]; 
            
            const scaleFactor = targetMeters / maxDim;
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);
            model.updateMatrixWorld(true);
        }

        if (gltf.animations && gltf.animations.length > 0) {
            if (!window.mixers) window.mixers = [];
            const mixer = new THREE.AnimationMixer(model);
            window.mixers.push(mixer);
            const clipToPlay = (animIndex !== null && gltf.animations[animIndex]) ? gltf.animations[animIndex] : gltf.animations[0];
            if (clipToPlay) mixer.clipAction(clipToPlay).play();
        }

        boundingBox.makeEmpty();
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
                const childBox = child.geometry.boundingBox.clone();
                childBox.applyMatrix4(child.matrixWorld);
                boundingBox.union(childBox);
            }
        });

        const finalSize = boundingBox.getSize(new THREE.Vector3());
        const center = boundingBox.getCenter(new THREE.Vector3());

        model.position.sub(center);

        const hitBoxGeometry = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false, wireframe: true }); 
        const anchorMesh = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);

        anchorMesh.userData.id = customId || `url_model_${index}`; 
        anchorMesh.userData.isAnchor = true;
        anchorMesh.userData.type = 'url_model'; 
        anchorMesh.userData.params = { url: url, pos: customPos, scale: customScale };

        anchorMesh.add(model);

        if (customPos) {
            const targetPos = new THREE.Vector3(customPos[0], customPos[1], customPos[2]);
            if (shouldSave) {
                targetPos.applyMatrix4(camera.matrixWorld);
            }
            anchorMesh.position.copy(targetPos);
        } else {
            const offsetX = (index * 0.4) - ((total - 1) * 0.2);
            const targetPos = new THREE.Vector3(offsetX, 0, -0.6).applyMatrix4(camera.matrixWorld);
            anchorMesh.position.copy(targetPos);
        }

        anchorMesh.userData.baseScale = anchorMesh.scale.clone();
        
        scene.add(anchorMesh);
        activeObjects.push(anchorMesh); 

        if (shouldSave) {
            saveToMemory();
        }

        if (typeof updateObjectSelectorUI === 'function') {
            updateObjectSelectorUI();
        }

    }, undefined, (error) => {
        console.error('Errore nel caricamento del modello da URL:', error);
    });
}

window.spawnObject = spawnObject;
window.removeObject = removeObject;

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

async function initApp() {
    let loadedIds = [];

    const saved = localStorage.getItem('ar_memory');
    if (saved) {
        const data = JSON.parse(saved);
        for (const item of data) {
            loadedIds.push(item.id);
            
            if (item.type === 'controlPanel') {
                await spawnObject(item.type, item.params, new THREE.Vector3().fromArray(item.pos), false, item.id);
            } else if (item.type === 'url_model') {
                loadGLBFromUrl(item.params.url, 0, 1, item.pos, item.scale, null, false, item.id);
            }
        }
    }

    if (!isMobileDevice && !loadedIds.includes('controlPanel_main')) {
        spawnObject('controlPanel', {}, null, true, 'controlPanel_main');
    }

// 3. GESTIONE URL
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrls = urlParams.getAll('model');
    const modelPos = urlParams.getAll('pos');
    const modelScale = urlParams.getAll('scale');
    const modelAnim = urlParams.getAll('anim'); 
    const modelIds = urlParams.getAll('id'); // <--- AGGIUNGIAMO LA LETTURA DEGLI ID!

    if (modelUrls.length > 0) {
        modelUrls.forEach((url, index) => {
            let expectedId;
            if (modelIds[index]) {
                expectedId = modelIds[index].trim();
            } else {
                const fileName = url.split('/').pop().replace(/[^a-zA-Z0-9]/g, ''); 
                expectedId = `url_model_${fileName}_${index}`;
            }

            if (!loadedIds.includes(expectedId)) {
                
                let posArray = null;
                if (modelPos[index]) {
                    const parts = modelPos[index].split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 3 && !parts.includes(NaN)) posArray = parts;
                }
                
                let scaleArray = null;
                if (modelScale[index]) {
                    const parts = modelScale[index].split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 1 && !isNaN(parts[0])) scaleArray = [parts[0], parts[0], parts[0]];
                    else if (parts.length === 3 && !parts.includes(NaN)) scaleArray = parts;
                }

                let animIndex = null;
                if (modelAnim[index]) animIndex = parseInt(modelAnim[index].trim(), 10);

                loadGLBFromUrl(url, index, modelUrls.length, posArray, scaleArray, animIndex, true, expectedId);
            }
        });
    }
}

initApp();


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
            const prompt = document.getElementById('ar-prompt');
            if (prompt) prompt.style.display = 'none';
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

    if (scene) {
        handleHover(controllers.left, objectsToUpdate);
        handleHover(controllers.right, objectsToUpdate);
        
        handleInteraction(controllers.left, objectsToUpdate, saveToMemory);
        handleInteraction(controllers.right, objectsToUpdate, saveToMemory);
    }

    if (window.isAutoRotating) {
        const selectedObj = getSelectedObject();
        if (selectedObj) {
            selectedObj.rotation.y += 0.015;
        }
    }

    renderer.render(scene, camera);
});