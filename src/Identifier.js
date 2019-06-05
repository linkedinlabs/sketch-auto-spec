import { fromNative } from 'sketch';
import { INITIAL_RESULT_STATE } from './constants';

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
 * @property messenger An instance of the Messenger class.
 */
export default class Identifier {
  constructor({
    for: layer,
    documentData,
    messenger,
  }) {
    this.layer = layer;
    this.documentData = documentData;
    this.messenger = messenger;
  }

  /**
   * @description Returns Kit-verified master symbol name of a layer. Cross-references
   * a symbol’s `symbolId` with the master symbol instance, and looks the name up
   * from connected Lingo Kit symbols.
   *
   * @kind function
   * @name getName
   * @returns {Object} A result object containing the Kit-verified symbol name (`data`) along with
   * success/error bool and log/toast messages.
   */
  getName() {
    const result = INITIAL_RESULT_STATE;

    // check for Lingo data - not much else we can do at the moment if it does not exist
    if (
      !this.documentData.userInfo()['com.lingoapp.lingo']
      || !this.documentData.userInfo()['com.lingoapp.lingo'].storage
    ) {
      result.error = true;
      result.messages.log = 'No data from Lingo in the file';
      result.messages.toast = '🆘 Lingo does not seem to be connected to this file.';
      return result;
    }
    const kitSymbols = this.documentData.userInfo()['com.lingoapp.lingo'].storage.hashes.symbols;

    // convert to json to expose params and find the `symbolId`
    const layerJSON = fromNative(this.layer);
    const { id, symbolId, type } = layerJSON;

    this.messenger.log(`Simple name for layer: ${this.layer.name()}`);

    // return if we do not actually have a Symbol selected
    if (!symbolId) {
      result.error = true;
      result.messages.log = `${id} is not a SymbolInstance; it is a ${type}`;
      result.messages.toast = '🆘 This layer is not a Symbol.';
      return result;
    }

    // use the API to find the MasterSymbol instance based on the `symbolId`
    const masterSymbol = this.documentData.symbolWithID(symbolId);
    const masterSymbolJSON = fromNative(masterSymbol);
    const masterSymbolId = masterSymbolJSON.id;

    // parse the connected Lingo Kit data and find the corresponding Kit Symbol
    const kitSymbol = kitSymbols[masterSymbolId];

    // could not find a matching master symbole in the Lingo Kit
    if (!kitSymbol) {
      result.error = true;
      result.messages.log = `${masterSymbolId} was not found in a connected Lingo Kit`;
      result.messages.toast = '😢 This symbol could not be found in a connected Lingo Kit. Please make sure your Kits are up-to-date.';
      return result;
    }

    // take only the last segment of the name (after a “/”, if available)
    let kitSymbolNameClean = kitSymbol.name.split('/').pop();
    // otherwise, fall back to the kit symbol name
    kitSymbolNameClean = !kitSymbolNameClean ? kitSymbol.name : kitSymbolNameClean;

    // return the official name and log it alongside the original layer name
    result.success = true;
    result.messages.log = `Name in Lingo Kit for “${this.layer.name()}” is “${kitSymbolNameClean}”`;
    result.data = kitSymbolNameClean;
    return result;
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
