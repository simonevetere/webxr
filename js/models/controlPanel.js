import * as THREE from 'three';
import { attachControls, createRoundedTexture, createArrow, createMenuContent, getNextPageIndex } from './factory.js';

export function create(params) {
    const config = { w: 0.45, h: 0.60, itemsPerPage: 4 };
    const state = { currentPage: 0 };

    // Ogni item ha la SUA azione (che in questo caso è lo spawn)
    const menuItems = [
        { label: 'Sedia', action: () => window.spawnObject?.('sedia') },
        { label: 'Mega Murena', action: () => window.spawnObject?.('megaMurena') },
        { label: 'Mega cubo', action: () => window.spawnObject?.('cubo') },
        { label: 'Tavolo', action: () => window.spawnObject?.('tavolo') },
        { label: 'Luce', action: () => window.spawnObject?.('luce') },
        { label: 'Armadio', action: () => window.spawnObject?.('armadio') }
    ];

    // Proprietà uniche del pannello
    const panelTexture = createRoundedTexture(config.w, config.h, 40, 'rgba(255,255,255,0.8)', 'rgba(0,0,0,0.4)');
    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w, config.h),
        new THREE.MeshBasicMaterial({ map: panelTexture, transparent: true, side: THREE.DoubleSide })
    );

    panel.userData = {
        type: 'controlPanel',
        isAnchor: true,
        controlledObject: panel,
        isFollower: true,
        isBillboard: true
    };

    let menuContainer = new THREE.Group();
    panel.add(menuContainer);

    const render = () => {
        panel.remove(menuContainer);
        menuContainer = createMenuContent(menuItems, state, config);
        panel.add(menuContainer);
    };

    const onArrowClick = (dir) => {
        state.currentPage = getNextPageIndex(dir, state.currentPage, menuItems.length, config.itemsPerPage);
        render();
    };

    // Navigazione e Controlli
    const arrowSize = config.w * 0.15;
    const arrowY = -(config.h * 0.35);
    
    const arrowUp = createArrow('up', arrowSize, () => onArrowClick('up'));
    const arrowDown = createArrow('down', arrowSize, () => onArrowClick('down'));
    arrowUp.position.set(-(config.w * 0.3), arrowY, 0.015);
    arrowDown.position.set((config.w * 0.3), arrowY, 0.015);

    panel.add(arrowUp, arrowDown);
    attachControls(panel, config.w, config.h);
    render();

    return panel;
}