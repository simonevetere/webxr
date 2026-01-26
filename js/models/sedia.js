import * as THREE from 'three';

export function create(params) {
    const group = new THREE.Group();

    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.02, 0.2), 
        new THREE.MeshStandardMaterial({color: 0x8b4513})
    );
    
    seat.userData = {
        isAnchor: true,
        controlledObject: group,
        isFollower: false
    };

    group.add(seat);

    const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.2, 0.2),
        new THREE.MeshStandardMaterial({color: 0x8b4513})
    );

    back.position.set(-0.09, 0.1, 0);
    
    back.userData = {
        isAnchor: true,
        controlledObject: group,
        isFollower: false
    };

    group.add(back);

    return group;
}