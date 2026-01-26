import * as THREE from 'three';

let lastSpawnTime = 0;

export function handleInteraction(controllerObj, scene, onUpdate) {
    if (!scene || typeof scene.traverse !== 'function' || !controllerObj || !controllerObj.hand) return;

    const { hand } = controllerObj;
    const indexTip = hand.joints['index-finger-tip'];
    const thumbTip = hand.joints['thumb-tip'];
    const wrist = hand.joints['wrist'];

    if (!indexTip?.position || !thumbTip?.position || !wrist?.quaternion) return;

    const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.035;

    // 1. Gestione Bottoni (Click fisico)
    updateButtons(scene, indexTip.position);

    // 2. Gestione Trascinamento e Rotazione (Grab)
    updateGrab(controllerObj, scene, indexTip.position, wrist.quaternion, isPinching, onUpdate);

    controllerObj.lastPinch = isPinching;
}

// --- SOTTO-FUNZIONE BOTTONI ---
function updateButtons(scene, fingerPos) {
    const currentTime = Date.now();
    scene.traverse((obj) => {
        if (!obj || !obj.parent || !obj.userData.isActionButton) return;

        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        const dist = fingerPos.distanceTo(worldPos);

        if (dist < 0.025) {
            if (!obj.userData.isBeingTouched && (currentTime - lastSpawnTime > 1000)) {
                if (obj.userData.onClick) {
                    obj.userData.onClick();
                    lastSpawnTime = currentTime;
                }
                obj.userData.isBeingTouched = true;
            }
        } else {
            obj.userData.isBeingTouched = false;
        }
    });
}

// --- SOTTO-FUNZIONE GRAB (CON ROTAZIONE OFFSET) ---
function updateGrab(controllerObj, scene, fingerPos, wristQuat, isPinching, onUpdate) {
    if (isPinching) {
        // Se non abbiamo ancora afferrato nulla, cerchiamo un'ancora
        if (!controllerObj.grabbedObject) {
            scene.traverse((obj) => {
                if (!obj || !obj.parent || !obj.userData.isAnchor) return;

                const worldPos = new THREE.Vector3();
                obj.getWorldPosition(worldPos);
                
                if (fingerPos.distanceTo(worldPos) < 0.07) {
                    controllerObj.grabbedObject = obj;
                    const target = obj.userData.controlledObject || obj;

                    // CALCOLO OFFSET INIZIALE: Fondamentale per girare l'oggetto
                    // Memorizziamo la rotazione dell'oggetto "rispetto" alla mano
                    controllerObj.initRotation = target.quaternion.clone().premultiply(wristQuat.clone().invert());
                }
            });
        }

        // Se abbiamo un oggetto in mano, aggiorniamo posizione e rotazione
        if (controllerObj.grabbedObject) {
            const target = controllerObj.grabbedObject.userData.controlledObject || controllerObj.grabbedObject;

            target.position.copy(fingerPos);

            if (!target.userData.isBillboard) {
                // Applica la rotazione del polso mantenendo l'angolo originale
                const newQuat = wristQuat.clone().multiply(controllerObj.initRotation);
                target.quaternion.copy(newQuat);
            }

            if (onUpdate) onUpdate();
        }
    } else {
        // Reset quando il pinch viene rilasciato
        controllerObj.grabbedObject = null;
        controllerObj.initRotation = null;
    }
}

export function handleHover(controllerObj, scene) {
    const { hand } = controllerObj;
    const indexTip = hand.joints['index-finger-tip'];
    
    if (!indexTip || !indexTip.position) return;

    const fingerPos = new THREE.Vector3();
    indexTip.getWorldPosition(fingerPos);

    scene.traverse((obj) => {
        if (obj.isMesh && (obj.userData.isAnchor || (obj.parent && obj.parent.userData.isAnchor))) {
            
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
}