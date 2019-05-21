import { fromNative } from 'sketch';

/**
* @description A class to handle identifying a Sketch layer as a valid part of the Design System.
*
* @class
* @name Identifier
*
* @constructor
*
* @property layer The layer that needs identification.
* @property document The Sketch document that contains the layer.
*/
export default class Identifier {
  constructor({
    for: layer,
    documentData,
  }) {
    this.layer = layer;
    this.documentData = documentData;
  }

  /**
   * @description Returns Kit-verified master symbol name of a layer. Cross-references
   * a symbol’s `symbolId` with the master symbol instance, and looks the name up
   * from connected Lingo Kit symbols.
   *
   * @kind function
   * @name label
   * @returns {string} The Kit-verified symbol name.
   */
  label() {
    // convert to json to expose params and find the `symbolId`
    const layerJSON = fromNative(this.layer);
    const { symbolId } = layerJSON;

    // use the API to find the MasterSymbol instance based on the `symbolId`
    const masterSymbol = this.documentData.symbolWithID(symbolId);
    const masterSymbolJSON = fromNative(masterSymbol);

    // parse the connected Lingo Kit data and find the corresponding Kit Symbol
    const kitSymbols = this.documentData.userInfo()['com.lingoapp.lingo'].storage.hashes.symbols;
    const kitSymbol = kitSymbols[masterSymbolJSON.id];

    log(`simple name for layer: ${this.layer.name()}`);
    log(`masterSymbolJSON for ${symbolId} is ${masterSymbolJSON.id}`);
    log(`official name in Lingo Kit is “${kitSymbol.name}”`);

    return kitSymbol.name;
  }

  /**
   * @description Returns the artboard the layer exists on.
   *
   * @kind function
   * @name artboard
   * @returns {Object} The parent artboard.
   */
  artboard() {
    return this.layer.parentArtboard();
  }
}
