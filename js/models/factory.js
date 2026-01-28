import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const icons = {
    locked: loader.load('./texture/icons/lock.svg'),
    unlocked: loader.load('./texture/icons/unlock.svg'),
    trash: loader.load('./texture/icons/trash.svg'),
    up: loader.load('./texture/icons/up.svg'),
    down: loader.load('./texture/icons/down.svg')
};

/**
 * Crea una texture con bordi arrotondati, bordo e testo opzionale
 */
export function createRoundedTexture(width, height, radius, strokeColor, bgColor, text = '', isIcon = false) {
    const canvas = document.createElement('canvas');
    // Manteniamo alta risoluzione basata sulle proporzioni
    canvas.width = 512;
    canvas.height = (height / width) * 512;
    const ctx = canvas.getContext('2d');
    const sw = canvas.width;
    const sh = canvas.height;

    ctx.clearRect(0, 0, sw, sh);

    // Disegno tracciato arrotondato proporzionale
    const r = (radius / width) * sw; 
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(sw - r, 0);
    ctx.quadraticCurveTo(sw, 0, sw, r);
    ctx.lineTo(sw, sh - r);
    ctx.quadraticCurveTo(sw, sh, sw - r, sh);
    ctx.lineTo(r, sh);
    ctx.quadraticCurveTo(0, sh, 0, sh - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fill();
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 10;
    ctx.stroke();

    if (text) {
        ctx.fillStyle = 'white';
        ctx.font = isIcon ? 'bold 80px Arial' : '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, sw / 2, sh / 2);
    }

    return new THREE.CanvasTexture(canvas);
}

/**
 * Aggiunge i controlli di Lock e Trash proporzionati al pannello
 */
export function attachControls(panel, width, height) {
    const depth = panel.geometry.parameters?.depth || 0.01;
    const zPos = (depth / 2) + 0.005; 

    const posY = -(height / 2) + (height * 0.1); 
    const btnSize = width * 0.12; 
    const spacing = btnSize * 0.7;

    const createButton = (iconType, color, xPos, action) => {
        const btn = new THREE.Mesh(
            new THREE.PlaneGeometry(btnSize, btnSize),
            new THREE.MeshBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.5,
                depthTest: true // Mantiene il corretto ordine di rendering
            })
        );
        const icon = new THREE.Mesh(
            new THREE.PlaneGeometry(btnSize * 0.8, btnSize * 0.8),
            new THREE.MeshBasicMaterial({ map: icons[iconType], transparent: true })
        );
        
        icon.position.z = 0.002; // Leggermente davanti al background del bottone
        btn.add(icon);
        btn.position.set(xPos, posY, zPos);
        
        btn.userData = { 
            isActionButton: true, 
            onClick: action, 
            iconMesh: icon,
            isLocked: false // Inizializziamo lo stato qui
        };
        return btn;
    };

    const lockBtn = createButton('unlocked', 0x00ff00, -spacing, function() {
        // 'this' qui si riferisce a userData del bottone
        this.isLocked = !this.isLocked;
        lockBtn.material.color.set(this.isLocked ? 0x0000ff : 0x00ff00);
        this.iconMesh.material.map = this.isLocked ? icons.locked : icons.unlocked;
        panel.userData.isLocked = this.isLocked;
    });

    const trashBtn = createButton('trash', 0xff0000, spacing, () => window.removeObject(panel));

    panel.add(lockBtn, trashBtn);
}

/**
 * Crea una freccia SVG standard
 */
export function createArrow(direction, size, action) {
    const arrow = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ 
            map: icons[direction], 
            transparent: true,
            alphaTest: 0.3 
        })
    );
    arrow.userData = { isActionButton: true, onClick: action };
    return arrow;
}

/**
 * Genera il contenuto del menu.
 * Ogni 'item' nell'array deve avere la propria funzione 'action'.
 */
export function createMenuContent(items, state, config) {
    const { w, h, itemsPerPage } = config;
    const container = new THREE.Group();
    
    const start = state.currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const spacing = h * 0.16;
    const startY = h * 0.3;

    items.forEach((item, index) => {
        if (index >= start && index < end) {
            const itemW = w * 0.85;
            const itemH = h * 0.13;
            const texture = createRoundedTexture(itemW, itemH, 20, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.1)', item.label);
            
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(itemW, itemH),
                new THREE.MeshBasicMaterial({ map: texture, transparent: true })
            );

            // La factory assegna l'azione specifica definita nell'item
            mesh.userData = {
                isActionButton: true,
                onClick: item.action 
            };

            const relativeIndex = index - start;
            mesh.position.set(0, startY - (relativeIndex * spacing), 0.01);
            container.add(mesh);
        }
    });

    return container;
}

/**
 * Calcola l'indice della pagina successiva/precedente
 */
export function getNextPageIndex(dir, current, total, perPage) {
    const max = Math.ceil(total / perPage);
    if (dir === 'up') return (current > 0) ? current - 1 : max - 1;
    return (current < max - 1) ? current + 1 : 0;
}