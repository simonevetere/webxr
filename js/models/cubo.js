import * as THREE from 'three';
import { attachControls } from './buttonFactory.js'; // Assicurati che il nome del file sia corretto

export function create(params = {}) {
    const size = params.size || 0.15; // 15cm di lato
    
    // 1. Creazione Mesh
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ 
        color: params.color || 0x0077ff,
        metalness: 0.5,
        roughness: 0.2
    });
    
    const cubo = new THREE.Mesh(geometry, material);

    // 2. Dati per la memoria e interazione
    cubo.userData = {
        type: 'cubo',
        params: params,
        isAnchor: true,      // Permette di afferrarlo e ruotarlo
        isFollower: false,   // Un cubo di solito non ti segue come un menu
        isLocked: false
    };

    // 3. Aggiungiamo i tasti (Lock e Trash)
    // Usiamo le dimensioni del cubo per posizionare i tasti alla base
    attachControls(cubo, size, size);

    return cubo;
}