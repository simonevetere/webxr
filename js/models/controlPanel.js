import * as THREE from 'three';
import { attachControls, createRoundedTexture, createArrow } from './factory.js';

export function create(params) {
    // 1. Configurazione Base
    const w = 0.45;
    const h = 0.60;
    const itemsPerPage = 4;
    let currentPage = 0;

    // 2. Pannello Principale
    const panelTexture = createRoundedTexture(w, h, 40, 'rgba(255,255,255,0.8)', 'rgba(0,0,0,0.4)');
    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: panelTexture, transparent: true, side: THREE.DoubleSide })
    );

    panel.userData = {
        type: 'controlPanel',
        isAnchor: true,
        controlledObject: panel,
        isFollower: true,
        isBillboard: true
    };

    // 3. Contenitore Menu e Dati
    const menuContainer = new THREE.Group();
    panel.add(menuContainer);

    const menuItems = [
        { label: 'Sedia', type: 'sedia'},
        { label: 'Mega Murena', type: 'megaMurena'},
        { label: 'Mega cubo', type: 'cubo'},
        { label: 'Tavolo', type: 'tavolo'},
        { label: 'Luce', type: 'luce'},
        { label: 'Armadio', type: 'armadio'}
    ];

    const itemMeshes = [];

    // 4. Creazione Item (Proporzionati)
    menuItems.forEach((item) => {
        const itemW = w * 0.85;
        const itemH = h * 0.13;
        const itemTexture = createRoundedTexture(itemW, itemH, 20, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.1)', item.label);
        
        const itemMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(itemW, itemH),
            new THREE.MeshBasicMaterial({ map: itemTexture, transparent: true })
        );

        itemMesh.userData = {
            isActionButton: true,
            onClick: () => window.spawnObject?.(item.type)
        };

        menuContainer.add(itemMesh);
        itemMeshes.push(itemMesh);
    });

    // 5. Logica Paginazione
    const updateVisibility = () => {
        const start = currentPage * itemsPerPage;
        const end = start + itemsPerPage;
        const startY = h * 0.3; // Inizia dal 30% dell'altezza totale dal centro verso l'alto
        const spacing = h * 0.16;

        itemMeshes.forEach((mesh, index) => {
            if (index >= start && index < end) {
                mesh.visible = true;
                const relativeIndex = index - start;
                mesh.position.set(0, startY - (relativeIndex * spacing), 0.01);
            } else {
                mesh.visible = false;
            }
        });
    };

    // 6. Frecce di Navigazione
    const arrowSize = w * 0.15;
    const arrowY = -(h * 0.35); // Posizionate sopra i tasti lock/trash
    
    const onArrowClick = (dir) => {
        const maxPages = Math.ceil(menuItems.length / itemsPerPage);
        if (dir === 'up') currentPage = (currentPage > 0) ? currentPage - 1 : maxPages - 1;
        else currentPage = (currentPage < maxPages - 1) ? currentPage + 1 : 0;
        updateVisibility();
    };

    const arrowUp = createArrow('up', arrowSize, () => onArrowClick('up'));
    arrowUp.position.set(-(w * 0.3), arrowY, 0.015);

    const arrowDown = createArrow('down', arrowSize, () => onArrowClick('down'));
    arrowDown.position.set((w * 0.3), arrowY, 0.015);

    panel.add(arrowUp, arrowDown);

    updateVisibility();
    attachControls(panel, w, h);

    return panel;
}