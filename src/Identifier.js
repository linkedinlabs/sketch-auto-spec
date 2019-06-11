import { fromNative, Settings } from 'sketch';
import { getInputFromUser, INPUT_TYPE } from 'sketch/ui';
import { INITIAL_RESULT_STATE, PLUGIN_IDENTIFIER } from './constants';

// --- private functions
/**
 * @description Sets the `annotationText` on a given layer’s settings object.
 *
 * @kind function
 * @name setAnnotationTextSettings
 * @param {string} annotationText The text to add to the layer’s settings.
 * @param {Object} layer The Sketch layer object receiving the settings update.
 */
const setAnnotationTextSettings = (annotationText, layer) => {
  let layerSettings = Settings.layerSettingForKey(layer, PLUGIN_IDENTIFIER);

  // set `annotationText` on the layer settings
  if (!layerSettings) {
    layerSettings = {
      annotationText,
    };
  } else {
    layerSettings.annotationText = annotationText;
  }

  // commit the settings update
  Settings.setLayerSettingForKey(layer, PLUGIN_IDENTIFIER, layerSettings);

  return null;
};

// --- main Identifier class function
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
   * @description Identifies the Kit-verified master symbol name of a layer and adds it to the
   * layer’s settings object: Cross-references a symbol’s `symbolId` with the master symbol
   * instance, and looks the name up from connected Lingo Kit symbols.
   *
   * @kind function
   * @name getLingoName
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  getLingoName() {
    const result = INITIAL_RESULT_STATE;

    // check for Lingo data - not much else we can do at the moment if it does not exist
    if (
      !this.documentData.userInfo()['com.lingoapp.lingo']
      || !this.documentData.userInfo()['com.lingoapp.lingo'].storage
    ) {
      result.status = 'error';
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
      result.status = 'error';
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
      result.status = 'error';
      result.messages.log = `${masterSymbolId} was not found in a connected Lingo Kit`;
      result.messages.toast = '😢 This symbol could not be found in a connected Lingo Kit. Please make sure your Kits are up-to-date.';
      return result;
    }

    // take only the last segment of the name (after a “/”, if available)
    let kitSymbolNameClean = kitSymbol.name.split('/').pop();
    // otherwise, fall back to the kit symbol name
    kitSymbolNameClean = !kitSymbolNameClean ? kitSymbol.name : kitSymbolNameClean;

    // set `annotationText` on the layer settings as the kit symbol name
    setAnnotationTextSettings(kitSymbolNameClean, this.layer);

    // log the official name alongside the original layer name and set as success
    result.status = 'success';
    result.messages.log = `Name in Lingo Kit for “${this.layer.name()}” is “${kitSymbolNameClean}”`;
    return result;
  }

  /**
   * @description Uses Sketch’s `getInputFromUser` dialog box to allow the user to set custom
   * annotation text and adds the text to the layer’s settings object.
   *
   * @kind function
   * @name setName
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  setName() {
    const result = INITIAL_RESULT_STATE;

    let customInput = null;
    getInputFromUser('Set the annotation’s text:', {
      type: INPUT_TYPE.string,
      initialValue: this.layer.name(),
    }, (error, value) => {
      customInput = {
        error,
        value,
      };
    });

    if (customInput.error) {
      // most likely the user canceled the input
      result.status = 'error';
      result.messages.log = 'Set name was canceled by user';
      return result;
    }

    const customName = customInput.value;
    // set `annotationText` on the layer settings as the custom name
    setAnnotationTextSettings(customName, this.layer);

    // log the custom name alongside the original layer name and set as success
    result.status = 'success';
    result.messages.log = `Custom Name set for “${this.layer.name()}” is “${customName}”`;
    return result;
  }
}
