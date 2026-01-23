import {Material} from '../core/material.js';
import {Node} from '../core/node.js';
import {Primitive, PrimitiveAttribute} from '../core/primitive.js';
import {SevenSegmentText} from './seven-segment-text.js';

class PanelMaterial extends Material {
  get materialName() {
    return 'TEXT_PANEL_VIEWER';
  }

  get vertexSource() {
    return `
    in vec3 POSITION;
    in vec3 COLOR_0;
    out vec4 vColor;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vColor = vec4(COLOR_0, 1.0);
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
    precision mediump float;
    in vec4 vColor;

    vec4 fragment_main() {
      return vColor;
    }`;
  }
}

export class Viewer extends Node {
  constructor() {
    super();

    this._text = "";
    this._sevenSegmentNode = new SevenSegmentText();
    
    // Posizionamento del testo nel pannello (uguale all'originale)
    this._sevenSegmentNode.matrix = new Float32Array([
      0.075, 0, 0, 0,
      0, 0.075, 0, 0,
      0, 0, 1, 0,
      -0.3625, 0.3625, 0.02, 1,
    ]);
  }

  onRendererChanged(renderer) {
    this.clearNodes();
    let gl = renderer.gl;

    let verts = [];
    let indices = [];

    function addBGSquare(left, bottom, right, top, z, r, g, b) {
      let idx = verts.length / 6;
      verts.push(left, bottom, z, r, g, b);
      verts.push(right, top, z, r, g, b);
      verts.push(left, top, z, r, g, b);
      verts.push(right, bottom, z, r, g, b);
      indices.push(idx, idx+1, idx+2, idx, idx+3, idx+1);
    }

    // Creiamo lo sfondo scuro originale
    addBGSquare(-0.5, -0.5, 0.5, 0.5, 0.0, 0.0, 0.0, 0.125); // Cornice esterna
    addBGSquare(-0.45, -0.45, 0.45, 0.45, 0.01, 0.0, 0.0, 0.4); // Sfondo interno

    let vertexBuffer = renderer.createRenderBuffer(gl.ARRAY_BUFFER, new Float32Array(verts));
    let indexBuffer = renderer.createRenderBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices));

    let attribs = [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, gl.FLOAT, 24, 0),
      new PrimitiveAttribute('COLOR_0', vertexBuffer, 3, gl.FLOAT, 24, 12),
    ];

    let primitive = new Primitive(attribs, indices.length);
    primitive.setIndexBuffer(indexBuffer);

    let renderPrimitive = renderer.createRenderPrimitive(primitive, new PanelMaterial());
    let panelNode = new Node();
    panelNode.addRenderPrimitive(renderPrimitive);

    this.addNode(panelNode);
    this.addNode(this._sevenSegmentNode);
  }

  get text() {
    return this._text;
  }

  set text(value) {
    // Pulizia testo per evitare i crash di sistema che abbiamo visto prima
    let safeText = value.toString().toUpperCase();
    
    // Il 7 segmenti non capisce la "V" o la "M". 
    // Le sostituiamo con caratteri simili che non fanno crashare il dizionario
    safeText = safeText.replace(/V/g, 'U').replace(/M/g, 'N').replace(/X/g, 'H');

    this._text = safeText;
    
    try {
        this._sevenSegmentNode.text = safeText;
    } catch(e) {
        // Se c'è un carattere che proprio non gli piace, lo ignoriamo invece di crashare
        console.warn("Carattere non supportato:", e);
    }
  }
}