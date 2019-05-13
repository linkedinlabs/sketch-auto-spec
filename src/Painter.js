// will handle the tasks of painting/drawing labels, and other adjustments
// in the actual Sketch file
import { Rectangle, ShapePath } from 'sketch/dom';

export default class Painter {
  constructor({ for: artboard }) {
    this.artboard = artboard;
  }

  add(layerName = 'New Label') {
    return new ShapePath({
      name: layerName,
      frame: new Rectangle(10, 10, 60, 60),
      parent: this.artboard,
      style: {
        fills: ['#ffcc3399'],
      },
    });
  }
}
