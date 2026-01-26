import * as THREE from 'three';

let lastSpawnTime = 0;
   
export function handleInteraction(controllerObj, scene, onUpdate) {
    
    if (!scene || typeof scene.traverse !== 'function' || !controllerObj || !controllerObj.hand) return;
    
    const { hand } = controllerObj;
    if (!hand) return;

    const indexTip = hand.joints['index-finger-tip'];
    const thumbTip = hand.joints['thumb-tip'];

    const wrist = hand.joints['wrist'];

    if (!indexTip?.position || !thumbTip?.position || !wrist?.quaternion) return;

    const isPinching = indexTip.position.distanceTo(thumbTip.position) < 0.035;
    const currentTime = Date.now();

    scene.traverse((obj) => {
        if (!obj || !obj.parent) return; 

        if (obj.userData.isActionButton) {
            const worldPos = new THREE.Vector3();
            obj.getWorldPosition(worldPos);
            const dist = indexTip.position.distanceTo(worldPos);

            if (dist < 0.025) {
                if (!obj.userData.isBeingTouched && (currentTime - lastSpawnTime > 1000)) {
                    
                    console.log("Azione eseguita su:", obj.userData.label);
                    
                    if (obj.userData.onClick) {
                        obj.userData.onClick();
                        lastSpawnTime = currentTime;
                    }
                    
                    obj.userData.isBeingTouched = true;
                }
            } else {
                obj.userData.isBeingTouched = false;
            }
        }
    });

    if (isPinching) {
        if (!controllerObj.grabbedObject) {
            scene.traverse((obj) => {
                if (obj.userData.isAnchor) {
                    const worldPos = new THREE.Vector3();
                    obj.getWorldPosition(worldPos);
                    if (indexTip.position.distanceTo(worldPos) < 0.07) {
                        controllerObj.grabbedObject = obj;
                    }
                }
            });
        }

        if (controllerObj.grabbedObject) {
            const anchor = controllerObj.grabbedObject;
            const target = anchor.userData.controlledObject || anchor;

            if (target) {
                target.position.copy(indexTip.position);
                if (!target.userData.isBillboard) {
                    target.quaternion.copy(wrist.quaternion);
                    target.rotateZ(Math.PI / 2);
                }

                if (onUpdate) onUpdate(); 
            }
        }
    } else {
        controllerObj.grabbedObject = null;
    }
    controllerObj.lastPinch = isPinching;
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