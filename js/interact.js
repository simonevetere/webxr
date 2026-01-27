import * as THREE from 'three';

let lastSpawnTime = 0;

export function handleInteraction(controllerObj, objectsArray, onUpdate) {
    if (!objectsArray || !controllerObj || !controllerObj.hand) return;

    const { hand } = controllerObj;
    const indexTip = hand.joints['index-finger-tip'];
    const thumbTip = hand.joints['thumb-tip'];
    const wrist = hand.joints['wrist'];

    if (!indexTip?.position || !thumbTip?.position || !wrist?.quaternion) return;

    const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.035;

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
                    if (found || !obj || !obj.userData.isAnchor) return;

                    // 1. Creiamo o recuperiamo la Bounding Box dell'oggetto
                    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
                    
                    // 2. Trasformiamo la posizione del dito nello spazio LOCALE dell'oggetto
                    // Questo serve per capire se il dito è "dentto" l'oggetto anche se è ruotato
                    const localFingerPos = fingerPos.clone();
                    obj.updateMatrixWorld(); // Assicuriamoci che la matrice sia aggiornata
                    obj.worldToLocal(localFingerPos);

                    // 3. Controlliamo se il punto è dentro la Box (con un piccolo margine di tolleranza)
                    const tolerance = 0.02; // 2cm di tolleranza extra "attorno" all'oggetto
                    const box = obj.geometry.boundingBox.clone().expandByScalar(tolerance);

                    if (box.containsPoint(localFingerPos)) {
                        controllerObj.grabbedObject = obj;
                        const target = obj.userData.controlledObject || obj;

                        // Calcoliamo l'offset iniziale (fondamentale per evitare lo scatto al centro)
                        controllerObj.grabOffset = new THREE.Vector3().subVectors(target.position, fingerPos);
                        controllerObj.initRotation = target.quaternion.clone().premultiply(wristQuat.clone().invert());
                        
                        found = true;
                    }
                });
                if (found) break;
            }
        }

        if (controllerObj.grabbedObject) {
            const target = controllerObj.grabbedObject.userData.controlledObject || controllerObj.grabbedObject;
            
            // Applichiamo l'offset per mantenere la presa dove abbiamo pizzicato
            target.position.copy(fingerPos.clone().add(controllerObj.grabOffset));

            if (!target.userData.isBillboard) {
                const newQuat = wristQuat.clone().multiply(controllerObj.initRotation);
                target.quaternion.copy(newQuat);
            }
            if (onUpdate) onUpdate();
        }
    } else {
        controllerObj.grabbedObject = null;
        controllerObj.initRotation = null;
        controllerObj.grabOffset = null;
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
        mainObj.traverse((obj) => {
            if (!obj || !obj.isMesh) return;

            if (obj.userData.isAnchor || (obj.parent && obj.parent.userData.isAnchor)) {
                const objWorldPos = new THREE.Vector3();
                obj.getWorldPosition(objWorldPos);
                
                const dist = fingerPos.distanceTo(objWorldPos);

                if (dist < 0.10) {
                    obj.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.2);
                } else {
                    obj.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
                }
            }
        });
    });
}