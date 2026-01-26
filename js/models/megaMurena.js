import * as THREE from 'three';
import { attachControls } from './buttonFactory.js';

export function create(params) {
    const w = params.width || 0.80;
    const h = params.height || 0.40;
    
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.01),
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('./texture/image/polipo.png') })
    );

    panel.userData = {
        type: 'murena',
        params: params,
        isFollower: true,
        isBillboard: true
    };

    attachControls(panel, w, h);

    return panel;
}