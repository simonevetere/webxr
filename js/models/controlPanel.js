import * as THREE from 'three';
import { attachControls } from './buttonFactory.js';

export function create(params) {
    const w = 0.45;
    const h = 0.60; 
    
    const loader = new THREE.TextureLoader();
    
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.01),
        new THREE.MeshBasicMaterial({ map: loader.load('./texture/image/polipo.png') })
    );

    panel.userData = {
        type: 'controlPanel',
        isAnchor: true,
        controlledObject: panel,
        isFollower: true,
        isBillboard: true
    };

    const menuItems = [
        { label: 'Sedia', type: 'sedia'},
        { label: 'Mega Murena', type: 'megaMurena'},
        { label: 'Mega cubo', type: 'cubo'}
    ];

    menuItems.forEach((item, index) => {

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        ctx.fillStyle = '#eeeeee'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stile del testo
        ctx.fillStyle = 'black';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, canvas.width / 2, canvas.height / 2);

        const textTexture = new THREE.CanvasTexture(canvas);

        const itemBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, 0.08),
            new THREE.MeshBasicMaterial({ 
                map: textTexture,
                transparent: true, 
                opacity: 0.5
            })
        );

        // Posizioniamo le voci una sotto l'altra
        itemBg.position.set(0, 0.2 - (index * 0.1), 0.011);

        itemBg.userData = {
            isActionButton: true,
            onClick: () => {
                console.log(`Spawno: ${item.label}`);
                if (window.spawnObject) {
                    window.spawnObject(item.type);
                }
            }
        };

        panel.add(itemBg);
    });

    // Aggiungiamo i soliti tasti Lock e Trash
    attachControls(panel, w, h);

    return panel;
}