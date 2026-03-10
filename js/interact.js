import * as THREE from 'three';

let lastSpawnTime = 0;

export function handleInteraction(controllerObj, objectsArray, onUpdate) {
    if (!objectsArray || !controllerObj || !controllerObj.hand) return;

    const { hand } = controllerObj;
    const indexTip = hand.joints['index-finger-tip'];
    const thumbTip = hand.joints['thumb-tip'];
    const wrist = hand.joints['wrist'];

    if (!indexTip?.position || !thumbTip?.position || !wrist?.quaternion) return;

    const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.01;
    
    objectsArray.forEach(mainObj => {
        mainObj.traverse(obj => {
            if (obj.userData.isHTML) {
                updateHTMLTouch(obj, indexTip.position, isPinching, controllerObj.lastPinch);
            }
        });
    });

    updateButtons(objectsArray, indexTip.position);

    updateGrab(controllerObj, objectsArray, indexTip.position, wrist.quaternion, isPinching, onUpdate);

    controllerObj.lastPinch = isPinching;
}

function updateButtons(objectsArray, fingerPos) {
    const currentTime = Date.now();

    objectsArray.forEach((mainObj) => {
        mainObj.traverse((obj) => {
            if (!obj || !obj.userData.isActionButton) return;

            // 1. Trasformiamo la posizione del dito nello spazio locale del bottone
            const localFinger = obj.worldToLocal(fingerPos.clone());

            // 2. Otteniamo le dimensioni della geometria del bottone
            // PlaneGeometry ha parametri width e height
            const w = obj.geometry.parameters.width / 2;
            const h = obj.geometry.parameters.height / 2;

            // 3. Controlliamo se il dito è dentro i confini (X e Y) 
            // e abbastanza vicino alla superficie (Z)
            const isInsideX = localFinger.x > -w && localFinger.x < w;
            const isInsideY = localFinger.y > -h && localFinger.y < h;
            const isNearZ = Math.abs(localFinger.z) < 0.02; // Tolleranza di 2cm davanti/dietro

            if (isInsideX && isInsideY && isNearZ) {
                if (!obj.userData.isBeingTouched && (currentTime - (window.lastSpawnTime || 0) > 1000)) {
                    if (obj.userData.onClick) {
                        // Passiamo 'obj.userData' come contesto se necessario
                        obj.userData.onClick.call(obj.userData);
                        window.lastSpawnTime = currentTime;
                    }
                    obj.userData.isBeingTouched = true;
                }
            } else {
                obj.userData.isBeingTouched = false;
            }
        });
    });
}

function updateGrab(controllerObj, objectsArray, fingerPos, wristQuat, isPinching, onUpdate) {
    if (isPinching) {
        if (!controllerObj.grabbedObject) {
            for (const mainObj of objectsArray) {
                let found = false;

                mainObj.traverse((obj) => {
                    if (found || !obj || !obj.userData.isAnchor || !obj.geometry) return;

                    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
                    
                    const localFingerPos = fingerPos.clone();
                    obj.updateMatrixWorld(); 
                    obj.worldToLocal(localFingerPos);

                    const tolerance = 0.015; 
                    const box = obj.geometry.boundingBox.clone().expandByScalar(tolerance);

                    if (box.containsPoint(localFingerPos)) {
                        controllerObj.grabbedObject = obj;
                        const target = obj.userData.controlledObject || obj;

                        controllerObj.grabOffset = new THREE.Vector3().subVectors(target.position, fingerPos);
                        controllerObj.grabOffset.applyQuaternion(wristQuat.clone().invert()); 
                        
                        controllerObj.initRotation = target.quaternion.clone().premultiply(wristQuat.clone().invert());
                        
                        found = true;
                    }
                });
                if (found) break;
            }
        }

         if (controllerObj.grabbedObject) {
            const target = controllerObj.grabbedObject.userData.controlledObject || controllerObj.grabbedObject;
            
            // Applica la nuova rotazione
            const newQuat = wristQuat.clone().multiply(controllerObj.initRotation);
            target.quaternion.copy(newQuat);

            // IL FIX DELLO SCATTO: Ora l'offset segue la rotazione del polso, non dell'oggetto!
            const rotatedOffset = controllerObj.grabOffset.clone().applyQuaternion(wristQuat);
            target.position.copy(fingerPos.clone().add(rotatedOffset));

            if (onUpdate) onUpdate();
        }
    } else {
        controllerObj.grabbedObject = null;
        controllerObj.initRotation = null;
        controllerObj.grabOffset = null;
    }
}
function updateHTMLTouch(obj, fingerPos) {
    if (!obj.geometry || !obj.geometry.parameters) {
        console.warn("HTMLInteraction: Oggetto senza parametri di geometria", obj);
        return;
    }

    // 1. Log posizione globale in ingresso
    console.log("Finger World Pos:", fingerPos); 

    // Trasformiamo la posizione del dito in locale
    const localFinger = obj.worldToLocal(fingerPos.clone());

    // 2. Otteniamo dimensioni della mesh
    const w = obj.geometry.parameters.width / 2;
    const h = obj.geometry.parameters.height / 2;

    // 3. Verifica collisione
    const isInsideX = localFinger.x > -w && localFinger.x < w;
    const isInsideY = localFinger.y > -h && localFinger.y < h;
    const isTouchingZ = Math.abs(localFinger.z) < 0.02; // Leggermente aumentato per debug

    // LOG DI STATO: Questo ti dice esattamente cosa fallisce
    if (Math.abs(localFinger.z) < 0.1) { // Logga solo se sei relativamente vicino (10cm)
        console.log(`HTML Check -> X: ${isInsideX} (${localFinger.x.toFixed(3)}), Y: ${isInsideY} (${localFinger.y.toFixed(3)}), Z: ${isTouchingZ} (${localFinger.z.toFixed(3)})`);
    }

    if (isInsideX && isInsideY && isTouchingZ) {
        if (!obj.userData.isBeingTouched) {
            const x = (localFinger.x / (w * 2)) + 0.5;
            const y = (localFinger.y / (h * 2)) + 0.5;
            const uv = new THREE.Vector2(x, 1 - y);

            console.log("%c CLICK HTML eseguito!", "color: #00ff00; font-weight: bold;", "UV:", uv);

            obj.dispatchEvent({ type: 'click', uv: uv });
            obj.userData.isBeingTouched = true;
        }
    } else {
        obj.userData.isBeingTouched = false;
    }
}

export function handleHover(controllerObj, objectsArray) {
    if (!objectsArray || !controllerObj || !controllerObj.hand) return;

    const { hand } = controllerObj;
    const indexTip = hand.joints['index-finger-tip'];
    
    if (!indexTip || !indexTip.position) return;

    const fingerPos = new THREE.Vector3();
    indexTip.getWorldPosition(fingerPos);

    objectsArray.forEach((mainObj) => {
        if (mainObj && mainObj.userData.isAnchor) {
            const objWorldPos = new THREE.Vector3();
            mainObj.getWorldPosition(objWorldPos);
            
            const dist = fingerPos.distanceTo(objWorldPos);

            if (!mainObj.userData.baseScale) {
                mainObj.userData.baseScale = mainObj.scale.clone();
            }

            if (dist < 0.2) {
                const hoverScale = mainObj.userData.baseScale.clone().multiplyScalar(1.05);
                mainObj.scale.lerp(hoverScale, 0.2);
            } else {
                mainObj.scale.lerp(mainObj.userData.baseScale, 0.2);
            }
        }
    });
}