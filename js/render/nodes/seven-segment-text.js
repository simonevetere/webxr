import {Material} from '../core/material.js';
import {Node} from '../core/node.js';
import {Primitive, PrimitiveAttribute} from '../core/primitive.js';

class TextMaterial extends Material {
  constructor() {
    super();
    this.baseColorTexture = { texture: { _texture: null } };
  }
  get materialName() { return 'TEXT_CENTERED_MATERIAL'; }
  
  get vertexSource() {
    return `
    in vec3 POSITION;
    in vec2 TEXCOORD_0;
    out vec2 vTexCoord;
    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vTexCoord = TEXCOORD_0;
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }
  get fragmentSource() {
    return `
    precision mediump float;
    uniform sampler2D baseColorTexture;
    in vec2 vTexCoord;
    vec4 fragment_main() {
      // Incolla l'immagine campionata direttamente nel return
      return texture(baseColorTexture, vTexCoord);
    }`;
  }
}

export class SevenSegmentText extends Node {
  constructor() {
    super();
    this._text = '';
    // Canvas proporzionato al pannello
    this._canvas = document.createElement('canvas');
    this._canvas.width = 1024;
    this._canvas.height = 256;
    this._ctx = this._canvas.getContext('2d');
    
    this._texture = null;
    this._gl = null;
    this._material = new TextMaterial();
  }

  onRendererChanged(renderer) {
    this.clearNodes();
    this._gl = renderer.gl;
    let gl = this._gl;

    this._texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this._material.baseColorTexture.texture._texture = this._texture;

    // GEOMETRIA SIMMETRICA: Da -0.5 a 0.5 per centrarsi sul pannello blu
    // x, y, z, u, v
    let vertices = [
      -0.5, -0.25, 0.0,   0.0, 1.0, 
       0.5, -0.25, 0.0,   1.0, 1.0,
      -0.5,  0.25, 0.0,   0.0, 0.0,
       0.5,  0.25, 0.0,   1.0, 0.0
    ];
    let indices = [0, 1, 2, 1, 3, 2];

    let vBuf = renderer.createRenderBuffer(gl.ARRAY_BUFFER, new Float32Array(vertices));
    let iBuf = renderer.createRenderBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices));

    let attribs = [
      new PrimitiveAttribute('POSITION', vBuf, 3, gl.FLOAT, 20, 0),
      new PrimitiveAttribute('TEXCOORD_0', vBuf, 2, gl.FLOAT, 20, 12),
    ];

    let primitive = new Primitive(attribs, indices.length);
    primitive.setIndexBuffer(iBuf);

    this.addRenderPrimitive(renderer.createRenderPrimitive(primitive, this._material));
    this._update();
  }

  get text() { return this._text; }
  set text(value) {
    this._text = value;
    this._update();
  }

  _update() {
    let ctx = this._ctx;
    let gl = this._gl;
    if (!ctx || !gl) return;

    // Sfondo Blu scuro (uguale al tuo screenshot)
    ctx.fillStyle = "rgb(0, 0, 40)"; 
    ctx.fillRect(0, 0, 1024, 256);

    // Bordo Cyan Neon
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, 1024, 256);

    // TESTO CENTRATO
    ctx.fillStyle = "#00ff00"; 
    ctx.font = "bold 250px Arial, sans-serif";
    ctx.textAlign = "center";    // Centra orizzontalmente sul canvas
    ctx.textBaseline = "middle"; // Centra verticalmente sul canvas
    
    // Scriviamo al centro esatto (512, 128)
    ctx.fillText(this._text, 512, 128);

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
  }
}