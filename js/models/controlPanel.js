import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export async function create(params) {
    const panelGroup = new THREE.Group();

    // --- BASE DEL PANNELLO (Ingrandito per farci stare lo schermo) ---
    const baseGeo = new RoundedBoxGeometry(0.44, 0.35, 0.01, 4, 0.005);
    const baseMat = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true,
        opacity: 0.7,
        depthWrite: true
    });
    
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.renderOrder = 0
    baseMesh.userData.isAnchor = true;
    baseMesh.userData.controlledObject = panelGroup;
    panelGroup.add(baseMesh);

    // --- HELPER: DISEGNO ICONE SUL CANVAS ---
    function drawIcon(ctx, type) {
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        ctx.lineWidth = 15;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        switch (type) {
            case "PLAY":
                ctx.beginPath(); 
                ctx.moveTo(90, 70); 
                ctx.lineTo(190, 128); 
                ctx.lineTo(90, 186); 
                ctx.fill(); 
                break;
            case "STOP":
                ctx.fillRect(85, 85, 86, 86); 
                break;
            case "Z_IN":
                ctx.beginPath(); 
                ctx.moveTo(128, 60); 
                ctx.lineTo(128, 196); 
                ctx.moveTo(60, 128); 
                ctx.lineTo(196, 128); 
                ctx.stroke(); 
                break;
            case "Z_OUT":
                ctx.beginPath(); 
                ctx.moveTo(60, 128); 
                ctx.lineTo(196, 128); 
                ctx.stroke(); 
                break;
            case "X":
                ctx.beginPath(); 
                ctx.moveTo(80, 80); 
                ctx.lineTo(176, 176); 
                ctx.moveTo(176, 80); 
                ctx.lineTo(80, 176); 
                ctx.stroke(); 
                break;
            case "GRAB":
                ctx.beginPath(); 
                ctx.arc(128, 90, 40, 0, Math.PI * 2); 
                ctx.fill(); 
                ctx.fillRect(120, 130, 16, 70); 
                break;
            case "LOCK":
                ctx.strokeRect(80, 120, 96, 70); 
                ctx.beginPath(); 
                ctx.arc(128, 120, 40, Math.PI, 0); 
                ctx.stroke(); 
                break;
            case "TRASH":
                ctx.strokeRect(90, 110, 76, 80); 
                ctx.beginPath(); 
                ctx.moveTo(80, 110); 
                ctx.lineTo(176, 110); 
                ctx.moveTo(110, 95); 
                ctx.lineTo(146, 95); 
                ctx.stroke(); 
                break;
            case "PREV":
                ctx.beginPath(); 
                ctx.moveTo(170, 70); 
                ctx.lineTo(80, 128); 
                ctx.lineTo(170, 186); 
                ctx.fill(); 
                break;
            case "NEXT":
                ctx.beginPath(); 
                ctx.moveTo(86, 70); 
                ctx.lineTo(176, 128); 
                ctx.lineTo(86, 186); 
                ctx.fill(); 
                break;
            case "ROTATE":
                ctx.beginPath();
                ctx.arc(128, 128, 45, Math.PI * 0.25, Math.PI * 1.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(115, 55);
                ctx.lineTo(165, 83);
                ctx.lineTo(115, 111);
                ctx.fill(); 
                break;
        }
    }

    // --- HELPER: CREAZIONE BOTTONE ---
    function createButton(x, y, colorHex, iconType, actionCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');

        function updateCanvas(bgColor, type) {
            ctx.clearRect(0, 0, 256, 256);
            ctx.fillStyle = '#' + bgColor.toString(16).padStart(6, '0');
            ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.fill();
            drawIcon(ctx, type);
        }

        updateCanvas(colorHex, iconType);

        const texture = new THREE.CanvasTexture(canvas);
        const btnGeo = new THREE.PlaneGeometry(0.065, 0.065); 
        const btnMat = new THREE.MeshBasicMaterial({ map: texture, 
                                                     transparent: true,
                                                     alphaTest: 0.05, 
                                                     depthWrite: true });
        const btnMesh = new THREE.Mesh(btnGeo, btnMat);
        
        btnMesh.position.set(x, y, 0.015);
        btnMesh.userData.isActionButton = true;
        btnMesh.userData.mesh = btnMesh;
        btnMesh.userData.onClick = actionCallback;
        
        btnMesh.userData.updateVisuals = (newColor, newType) => {
            updateCanvas(newColor, newType);
            texture.needsUpdate = true; 
        };

        panelGroup.add(btnMesh);
        return btnMesh;
    }

    // --- HELPER: SCHERMO DI SELEZIONE 3D ---
    function createScreen(x, y) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        
        const geo = new THREE.PlaneGeometry(0.22, 0.055);
        const mat = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            alphaTest: 0.05,
            depthWrite: true
        });
        const screenMesh = new THREE.Mesh(geo, mat);
        screenMesh.position.set(x, y, 0.012);

        screenMesh.userData.updateText = (text) => {
            ctx.clearRect(0, 0, 512, 128);
            // Sfondo schermo
            ctx.fillStyle = "#111111"; ctx.fillRect(0, 0, 512, 128);
            // Bordo azzurro tech
            ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 10; ctx.strokeRect(0, 0, 512, 128);
            // Testo
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 50px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 256, 64);
            texture.needsUpdate = true;
        };

        panelGroup.add(screenMesh);
        return screenMesh;
    }

    const screen = createScreen(0, 0.11);

    // --- LOGICA DI SELEZIONE GLOBALE ---
    function getModels() {
        return window.activeObjects ? window.activeObjects.filter(o => o.userData.type === 'url_model') : [];
    }

    function getSelectedObject() {
        const models = getModels();
        if (models.length === 0) return null;
        if (window.selectedObjectIndex === undefined || window.selectedObjectIndex >= models.length) {
            window.selectedObjectIndex = 0;
        }
        return models[window.selectedObjectIndex];
    }

    function updateScreenUI() {
        const obj = getSelectedObject();
        if (obj) {
            let name = obj.userData.id || `Obj ${window.selectedObjectIndex + 1}`;
            if (name.startsWith('url_model_')) name = name.replace('url_model_', '');
            screen.userData.updateText(name);
        } else {
            screen.userData.updateText("NO MODEL");
        }
        // Sincronizza anche l'UI 2D se esiste (per quando sei misto mobile/VR)
        if (window.updateObjectSelectorUI) window.updateObjectSelectorUI();
    }

    // --- POSIZIONAMENTO BOTTONI ---

    // RIGA IN ALTO: Navigazione Oggetti
    createButton(-0.16, 0.11, 0x444444, "PREV", () => {
        const models = getModels();
        if (models.length > 0) {
            window.selectedObjectIndex = (window.selectedObjectIndex - 1 + models.length) % models.length;
            updateScreenUI();
        }
    });

    createButton(0.16, 0.11, 0x444444, "NEXT", () => {
        const models = getModels();
        if (models.length > 0) {
            window.selectedObjectIndex = (window.selectedObjectIndex + 1) % models.length;
            updateScreenUI();
        }
    });

    // RIGA CENTRALE: Controlli (Agiscono SOLO sul selectedObj)
    let isPlaying = true;
    createButton(-0.16, 0.01, 0x00aa00, "PLAY", function() {
        isPlaying = !isPlaying;
        const color = isPlaying ? 0x00aa00 : 0x444444;
        const icon = isPlaying ? "PLAY" : "STOP";
        this.mesh.userData.updateVisuals(color, icon);
        if (window.mixers) {
            window.mixers.forEach(m => m.timeScale = isPlaying ? 1 : 0);
        }
    });

    createButton(-0.08, 0.01, 0x222222, "Z_OUT", () => {
        const obj = getSelectedObject();
        if (obj) {
            const originalGrabState = obj.userData.isAnchor;
            obj.userData.isAnchor = false;
            obj.scale.multiplyScalar(0.85);
            if(obj.userData.baseScale) obj.userData.baseScale.copy(obj.scale);
            
            setTimeout(() => {
                obj.userData.isAnchor = originalGrabState;
                obj.updateMatrixWorld(true);
            }, 50);
        }
    });

    createButton(0, 0.01, 0x222222, "Z_IN", () => {
        const obj = getSelectedObject();
        console.log(obj);
        if (obj) {
            const originalGrabState = obj.userData.isAnchor;
            obj.userData.isAnchor = false;
            obj.scale.multiplyScalar(1.15);
            if(obj.userData.baseScale) obj.userData.baseScale.copy(obj.scale);
            
            setTimeout(() => {
                obj.userData.isAnchor = originalGrabState;
                obj.updateMatrixWorld(true);
            }, 50);
        }
    });

    // NUOVO BOTTONE: ROTAZIONE (Attiva/Disattiva la rotazione globale)
    createButton(0.08, 0.01, 0x222222, "ROTATE", function() {
        window.isAutoRotating = !window.isAutoRotating;
        const color = window.isAutoRotating ? 0xffaa00 : 0x222222;
        this.mesh.userData.updateVisuals(color, "ROTATE");
    });

    let isGrabEnabled = true;
    createButton(0.16, 0.01, 0x9d00ff, "GRAB", function() {
        isGrabEnabled = !isGrabEnabled;
        const color = isGrabEnabled ? 0x9d00ff : 0x444444;
        const icon = isGrabEnabled ? "GRAB" : "LOCK";
        this.mesh.userData.updateVisuals(color, icon);
        
        // Blocca/Sblocca SOLO l'oggetto selezionato
        const obj = getSelectedObject();
        if (obj) obj.userData.isAnchor = isGrabEnabled;
    });

    // RIGA IN BASSO: Azioni distruttive
    createButton(-0.08, -0.10, 0xaa0000, "TRASH", function() {
        const obj = getSelectedObject();
        if (obj && window.removeObject) {
            window.removeObject(obj);
            window.selectedObjectIndex = 0; // Resetta la selezione
            updateScreenUI();
        }
    });

    createButton(0.08, -0.10, 0x444444, "X", function() {
        const session = window.renderer?.xr?.getSession();
        if (session) session.end();
        window.history.back();
    });

    // Inizializza lo schermo al primo caricamento
    setTimeout(updateScreenUI, 500);

    return panelGroup;
}