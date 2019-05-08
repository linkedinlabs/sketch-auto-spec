// will traverse array of selected items and
// return useful items (parent layer, artboard, document, etc)
// will find items based on ID (or timestamp)
export default class Crawler {
  constructor({ for: selectionArray }) {
    // log(selectionArray)
    this.array = selectionArray;
  }

  first() {
    return this.array[0];
  }
}
