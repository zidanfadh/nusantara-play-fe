/**
 * Turns one Nature Kit model (a node of nature.glb) into a single geometry with vertex colours
 * (Phase 11). The pack's materials are flat colours, so baking them into the vertices lets every
 * model type render as ONE instanced draw call with one shared material, and lets the scene remap
 * the colours to its own soft palette (SceneColors.materials).
 *
 * Reads attributes through getX/getY/getZ, which also dequantizes the meshopt/KHR_mesh_quantization
 * attributes of the optimized file.
 */
import { Box3, BufferGeometry, Color, Float32BufferAttribute, Matrix3, Matrix4, Mesh, Vector3, type Material, type Object3D } from 'three';

function materialColor(material: Material | Material[], overrides: Record<string, string>): Color {
  const m = Array.isArray(material) ? material[0] : material;
  const override = m?.name ? overrides[m.name] : undefined;
  if (override) return new Color(override);
  const color = (m as Material & { color?: Color }).color;
  return color ? color.clone() : new Color('#999999');
}

export function bakeModel(root: Object3D, overrides: Record<string, string>): BufferGeometry {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const p = new Vector3();
  const n = new Vector3();
  const matrix = new Matrix4();
  const normalMatrix = new Matrix3();

  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const geometry = obj.geometry as BufferGeometry;
    const pos = geometry.getAttribute('position');
    const nor = geometry.getAttribute('normal');
    if (!pos) return;
    matrix.multiplyMatrices(toRoot, obj.matrixWorld);
    normalMatrix.getNormalMatrix(matrix);
    const color = materialColor(obj.material, overrides);
    const index = geometry.getIndex();
    const count = index ? index.count : pos.count;
    for (let k = 0; k < count; k += 1) {
      const i = index ? index.getX(k) : k;
      p.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      positions.push(p.x, p.y, p.z);
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      else n.set(0, 1, 0);
      normals.push(n.x, n.y, n.z);
      colors.push(color.r, color.g, color.b);
    }
  });

  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new Float32BufferAttribute(colors, 3));
  // Centre on x/z (some pack models sit on a tile edge); keep the base at y = 0.
  const box = new Box3().setFromBufferAttribute(out.getAttribute('position') as Float32BufferAttribute);
  out.translate(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2);
  out.computeBoundingSphere();
  return out;
}
