import * as THREE from 'three';

export async function create(params) {
    const panelGroup = new THREE.Group();
    panelGroup.userData.isAnchor = true;

    // 1. Base del pannello più alta (da 0.15 a 0.25) per fare spazio a 2 righe
    const baseGeo = new THREE.BoxGeometry(0.4, 0.25, 0.02);
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    panelGroup.add(baseMesh);

    // --- HELPER: Crea bottone con Canvas Texture (con supporto per l'A CAPO) ---
    function createButton(x, y, colorHex, text, actionCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        function drawVisuals(bgColor, label) {
            // Sfondo
            ctx.fillStyle = '#' + bgColor.toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 256, 256);
            
            // Testo
            ctx.font = 'bold 50px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Gestione dell'a capo se passiamo il simbolo "\n"
            const lines = label.split('\n');
            if (lines.length > 1) {
                ctx.fillText(lines[0], 128, 100); // Prima riga più in alto
                ctx.fillText(lines[1], 128, 160); // Seconda riga più in basso
            } else {
                ctx.fillText(label, 128, 128);    // Riga singola centrata
            }
        }

        drawVisuals(colorHex, text);

        const texture = new THREE.CanvasTexture(canvas);
        const btnGeo = new THREE.PlaneGeometry(0.06, 0.06); 
        const btnMat = new THREE.MeshBasicMaterial({ map: texture });
        const btnMesh = new THREE.Mesh(btnGeo, btnMat);
        
        btnMesh.position.set(x, y, 0.011); 
        
        btnMesh.userData.isActionButton = true;
        btnMesh.userData.mesh = btnMesh;
        btnMesh.userData.onClick = actionCallback;
        
        btnMesh.userData.updateVisuals = function(newColor, newText) {
            drawVisuals(newColor, newText);
            texture.needsUpdate = true; 
        };

        panelGroup.add(btnMesh);
        return btnMesh;
    }

    // ==========================================
    // RIGA SUPERIORE (y = 0.05)
    // ==========================================
    
    // 1. PLAY / STOP
    let isPlaying = true;
    createButton(-0.12, 0.05, 0x00aa00, "PLAY", function() {
        const btn = this.mesh;
        isPlaying = !isPlaying;
        btn.userData.updateVisuals(isPlaying ? 0x00aa00 : 0xaa0000, isPlaying ? "PLAY" : "STOP");

        if (window.mixers) {
            window.mixers.forEach(mixer => mixer.timeScale = isPlaying ? 1 : 0);
        }
    });

    // 2. ZOOM OUT (Azzurro scuro)
    createButton(-0.04, 0.05, 0x0055ff, "-\nZOOM", function() {
        if (!window.activeObjects) return;
        window.activeObjects.forEach(obj => {
            if (obj.userData.type === 'url_model') {
                obj.scale.multiplyScalar(0.8);
                obj.updateMatrixWorld(true);
            }
        });
    });

    // 3. ZOOM IN (Azzurro chiaro)
    createButton(0.04, 0.05, 0x55aaff, "+\nZOOM", function() {
        if (!window.activeObjects) return;
        window.activeObjects.forEach(obj => {
            if (obj.userData.type === 'url_model') {
                obj.scale.multiplyScalar(1.2);
                obj.updateMatrixWorld(true);
            }
        });
    });

    // 4. GRAB / LOCK (Arancione)
    let isGrabEnabled = true;
    createButton(0.12, 0.05, 0xddaa00, "GRAB", function() {
        const btn = this.mesh;
        isGrabEnabled = !isGrabEnabled;
        btn.userData.updateVisuals(isGrabEnabled ? 0xddaa00 : 0x8800ff, isGrabEnabled ? "GRAB" : "LOCK");

        if (!window.activeObjects) return;
        window.activeObjects.forEach(obj => {
            if (obj.userData.type === 'url_model') {
                obj.userData.isAnchor = isGrabEnabled;
            }
        });
    });


    // ==========================================
    // RIGA INFERIORE (y = -0.05)
    // ==========================================

    // 5. DELETE OBJ (Cancella i modelli 3D caricati)
    createButton(-0.04, -0.05, 0xff5500, "DEL\nOBJ", function() {
        if (!window.activeObjects || !window.removeObject) return;
        
        const objectsToDelete = window.activeObjects.filter(obj => obj.userData.type === 'url_model');
        objectsToDelete.forEach(obj => {
            window.removeObject(obj);
        });
    });

    // 6. CHIUDI PANNELLO (X)
    createButton(0.04, -0.05, 0xdd0000, "X", function() {
        window.history.back();
    });

    return panelGroup;
}