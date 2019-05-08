// expects a single layer
export default class Identifier {
  constructor({ for: layer }) {
    this.name = 'Identifier';
    this.layer = layer;
  }

  label() {
    return this.layer.name();
  }

  artboard() {
    return this.layer.parentArtboard();
  }
}
