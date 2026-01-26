import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const icons = {
    locked: loader.load('./texture/icons/lock.svg'),
    unlocked: loader.load('./texture/icons/unlock.svg'),
    trash: loader.load('./texture/icons/trash.svg')
};

export function attachControls(panel, width, height) {
    const posX = (width / 2) - 0.03;
    const posYTop = (height / 2) - 0.03;
    const posYBottom = -(height / 2) + 0.03;

    // --- BOTTONE LUCCHETTO ---
    const anchorBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    const anchorIcon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.04),
        new THREE.MeshBasicMaterial({ map: icons.unlocked, transparent: true })
    );
    anchorIcon.position.z = 0.001;
    anchorBg.add(anchorIcon);
    anchorBg.position.set(posX, posYTop, 0.011);

    anchorBg.userData = {
        isActionButton: true,
        isLocked: false,
        onClick: function() {
            this.isLocked = !this.isLocked;
            anchorBg.material.color.set(this.isLocked ? 0x0000ff : 0x00ff00);
            anchorIcon.material.map = this.isLocked ? icons.locked : icons.unlocked;
            panel.userData.isLocked = this.isLocked;
        }
    };

    // --- BOTTONE CESTINO ---
    const trashBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
    );
    const trashIcon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.04),
        new THREE.MeshBasicMaterial({ map: icons.trash, transparent: true })
    );
    trashIcon.position.z = 0.001;
    trashBg.add(trashIcon);
    trashBg.position.set(posX, posYBottom, 0.011);

    trashBg.userData = {
        isActionButton: true,
        onClick: () => window.removeObject(panel)
    };

    panel.add(anchorBg);
    panel.add(trashBg);
}