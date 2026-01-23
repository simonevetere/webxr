import {Material} from '../core/material.js';
import {Node} from '../core/node.js';
import {Primitive, PrimitiveAttribute} from '../core/primitive.js';

const TEXT_KERNING = 2.0;
const LINE_HEIGHT = 3.0;  
const CHARS_PER_LINE = 8; 

class FourteenSegmentMaterial extends Material {
  get materialName() { return 'FOURTEEN_SEGMENT_TEXT'; }

  get vertexSource() {
    return `
    in vec2 POSITION;
    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      return proj * view * model * vec4(POSITION, 0.0, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
    precision mediump float;
    const vec4 fragColor = vec4(0.0, 1.0, 0.0, 1.0); 
    vec4 fragment_main() { return fragColor; }`;
  }
}

export class SevenSegmentText extends Node {
  constructor() {
    super();
    this._text = '';
    this._charNodes = [];
  }

  onRendererChanged(renderer) {
  this.clearNodes();
  let gl = renderer.gl;
  let vertices = [];
  let segmentIndices = {};
  let indices = [];

  const th = 0.12;   // Spessore dei segmenti
  const L = -1.0;    // Margine sinistro
  const R = 0.5;     // Margine destro
  const CX = -0.25;  // Centro esatto tra L e R

  // Funzione unica per definire la geometria di ogni segmento
  function defSeg(id, p1, p2, p3, p4) {
    let idx = vertices.length / 2;
    vertices.push(...p1, ...p2, ...p3, ...p4);
    // Crea due triangoli per ogni segmento (6 indici)
    segmentIndices[id] = [idx, idx + 2, idx + 1, idx, idx + 3, idx + 2];
  }

  // --- 1. SEGMENTI ORIZZONTALI ---
  defSeg('top',    [L, 1], [R, 1], [R, 1 - th], [L, 1 - th]);
  defSeg('mid-l',  [L, th / 2], [CX, th / 2], [CX, -th / 2], [L, -th / 2]);
  defSeg('mid-r',  [CX, th / 2], [R, th / 2], [R, -th / 2], [CX, -th / 2]);
  defSeg('bot',    [L, -1 + th], [R, -1 + th], [R, -1], [L, -1]);

  // --- 2. SEGMENTI VERTICALI ESTERNI ---
  defSeg('tl', [L, 1], [L + th, 1], [L + th, 0], [L, 0]);
  defSeg('tr', [R - th, 1], [R, 1], [R, 0], [R - th, 0]);
  defSeg('bl', [L, 0], [L + th, 0], [L + th, -1], [L, -1]);
  defSeg('br', [R - th, 0], [R, 0], [R, -1], [R - th, -1]);

  // --- 3. SEGMENTI VERTICALI CENTRALI ---
  defSeg('tc', [CX - th / 2, 1 - th], [CX + th / 2, 1 - th], [CX + th / 2, 0], [CX - th / 2, 0]);
  defSeg('bc', [CX - th / 2, 0], [CX + th / 2, 0], [CX + th / 2, -1 + th], [CX - th / 2, -1 + th]);

  // --- 4. DIAGONALI (Puntano tutte al centro esatto [CX, 0]) ---
  defSeg('d1', [L + th, 1 - th], [CX, 0], [CX - th, 0], [L + th, 1 - th - th]);
  defSeg('d2', [R - th, 1 - th], [CX, 0], [CX + th, 0], [R - th, 1 - th - th]);
  defSeg('d3', [L + th, -1 + th], [CX, 0], [CX - th, 0], [L + th, -1 + th + th]);
  defSeg('d4', [R - th, -1 + th], [CX, 0], [CX + th, 0], [R - th, -1 + th + th]);

  let characters = {};
  function defineCharacter(c, segs) {
    let char = { character: c, offset: indices.length * 2, count: 0 };
    for (let s of segs) {
      if (segmentIndices[s]) {
        let seg = segmentIndices[s];
        char.count += seg.length;
        indices.push(...seg);
      }
    }
    characters[c] = char;
  }

  // --- MAPPATURA CARATTERI ---
  defineCharacter('0', ['top', 'bot', 'tl', 'tr', 'bl', 'br', 'd2', 'd3']);
  defineCharacter('1', ['tr', 'br']);
  defineCharacter('2', ['top', 'mid-l', 'mid-r', 'bot', 'tr', 'bl']);
  defineCharacter('3', ['top', 'mid-r', 'bot', 'tr', 'br']);
  defineCharacter('4', ['mid-l', 'mid-r', 'tl', 'tr', 'br']);
  defineCharacter('5', ['top', 'mid-l', 'mid-r', 'bot', 'tl', 'br']);
  defineCharacter('6', ['top', 'mid-l', 'mid-r', 'bot', 'tl', 'bl', 'br']);
  defineCharacter('7', ['top', 'tr', 'br']);
  defineCharacter('8', ['top', 'mid-l', 'mid-r', 'bot', 'tl', 'tr', 'bl', 'br']);
  defineCharacter('9', ['top', 'mid-l', 'mid-r', 'bot', 'tl', 'tr', 'br']);

  defineCharacter('A', ['top', 'mid-l', 'mid-r', 'tl', 'tr', 'bl', 'br']);
  defineCharacter('B', ['top', 'mid-r', 'bot', 'tr', 'br', 'tc', 'bc']);
  defineCharacter('C', ['top', 'bot', 'tl', 'bl']);
  defineCharacter('D', ['top', 'bot', 'tr', 'br', 'tc', 'bc']); // D finalmente decente
  defineCharacter('E', ['top', 'mid-l', 'bot', 'tl', 'bl']);
  defineCharacter('F', ['top', 'mid-l', 'tl', 'bl']);
  defineCharacter('G', ['top', 'bot', 'mid-r', 'tl', 'bl', 'br']);
  defineCharacter('H', ['mid-l', 'mid-r', 'tl', 'tr', 'bl', 'br']);
  defineCharacter('I', ['top', 'bot', 'tc', 'bc']); 
  defineCharacter('J', ['bot', 'tr', 'br', 'bl']);
  defineCharacter('K', ['tl', 'bl', 'mid-l', 'd2', 'd4']);
  defineCharacter('L', ['bot', 'tl', 'bl']);
  defineCharacter('M', ['tl', 'bl', 'tr', 'br', 'd1', 'd2']);
  defineCharacter('N', ['tl', 'bl', 'tr', 'br', 'd1', 'd4']);
  defineCharacter('O', ['top', 'bot', 'tl', 'tr', 'bl', 'br']);
  defineCharacter('P', ['top', 'mid-l', 'mid-r', 'tl', 'tr', 'bl']);
  defineCharacter('Q', ['top', 'bot', 'tl', 'tr', 'bl', 'br', 'd4']);
  defineCharacter('R', ['top', 'mid-l', 'mid-r', 'tl', 'tr', 'bl', 'd4']);
  defineCharacter('S', ['top', 'mid-l', 'mid-r', 'bot', 'tl', 'br']);
  defineCharacter('T', ['top', 'tc', 'bc']);
  defineCharacter('U', ['bot', 'tl', 'tr', 'bl', 'br']);
  defineCharacter('V', ['tl', 'bl', 'd2', 'd3']);
  defineCharacter('W', ['tl', 'bl', 'tr', 'br', 'd3', 'd4']);
  defineCharacter('X', ['d1', 'd2', 'd3', 'd4']);
  defineCharacter('Y', ['d1', 'd2', 'bc']);
  defineCharacter('Z', ['top', 'bot', 'd2', 'd3']);

  defineCharacter(' ', []);
  defineCharacter('_', ['bot']);

  // Creazione Buffer e Primitives
  let vertexBuffer = renderer.createRenderBuffer(gl.ARRAY_BUFFER, new Float32Array(vertices));
  let indexBuffer = renderer.createRenderBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices));
  let material = new FourteenSegmentMaterial();

  this._charPrimitives = {};
  for (let char in characters) {
    let charDef = characters[char];
    let primitive = new Primitive([new PrimitiveAttribute('POSITION', vertexBuffer, 2, gl.FLOAT, 8, 0)], charDef.count);
    primitive.setIndexBuffer(indexBuffer);
    primitive.indexByteOffset = charDef.offset;
    this._charPrimitives[char] = renderer.createRenderPrimitive(primitive, material);
  }
  
  this.text = this._text;
}

  set text(value) {
    this._text = value.toUpperCase();
    let i = 0;

    for (; i < this._text.length; ++i) {
      let char = this._text[i];
      
      // Sicurezza per evitare i crash visti in console
      let charPrimitive = this._charPrimitives[char] || this._charPrimitives[' '] || this._charPrimitives['_'];

      // MODULO per la colonna (0-7), DIVISIONE per la riga
      let column = i % CHARS_PER_LINE;
      let row = Math.floor(i / CHARS_PER_LINE);

      if (this._charNodes.length <= i) {
        let node = new Node();
        node.addRenderPrimitive(charPrimitive);
        this._charNodes.push(node);
        this.addNode(node);
      } else {
        this._charNodes[i].clearRenderPrimitives();
        this._charNodes[i].addRenderPrimitive(charPrimitive);
        this._charNodes[i].visible = true;
      }

      // Posizionamento: la Y scende (-row) ogni 8 caratteri
      this._charNodes[i].translation = [
        column * TEXT_KERNING, 
        -row * LINE_HEIGHT, 
        0
      ];
    }

    // Nasconde i nodi vecchi se scrivi una parola più corta
    for (; i < this._charNodes.length; ++i) {
      this._charNodes[i].visible = false;
    }
  }
}