declare module "three" {
  export class Scene {
    add(object: unknown): void;
    x: number;
    y: number;
    z: number;
  }

  export class OrthographicCamera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
    position: { z: number };
  }

  export class WebGLRenderer {
    constructor(params?: { antialias?: boolean; alpha?: boolean });
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
    getPixelRatio(): number;
  }

  export class PlaneGeometry {
    constructor(width: number, height: number);
    dispose(): void;
  }

  export class Mesh {
    constructor(geometry: PlaneGeometry, material: ShaderMaterial);
    geometry: PlaneGeometry;
    material: ShaderMaterial;
  }

  export class ShaderMaterial {
    constructor(params?: { uniforms?: Record<string, unknown>; vertexShader?: string; fragmentShader?: string; transparent?: boolean });
    dispose(): void;
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    copy(v: Vector2): this;
    lerp(v: Vector2, alpha: number): this;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
  }

  export class Clock {
    getElapsedTime(): number;
  }
}
