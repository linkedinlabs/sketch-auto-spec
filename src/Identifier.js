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
 * @param {string} annotationType The type of annotation (`custom`, `component`, `style`).
 * @param {Object} layer The Sketch layer object receiving the settings update.
 */
const setAnnotationTextSettings = (annotationText, annotationType, layer) => {
  let layerSettings = Settings.layerSettingForKey(layer, PLUGIN_IDENTIFIER);

  // set `annotationText` on the layer settings
  if (!layerSettings) {
    layerSettings = {
      annotationText,
      annotationType,
    };
  } else {
    layerSettings.annotationText = annotationText;
    layerSettings.annotationType = annotationType;
  }

  // commit the settings update
  Settings.setLayerSettingForKey(layer, PLUGIN_IDENTIFIER, layerSettings);

  return null;
};

const cleanName = (name) => {
  // take only the last segment of the name (after a “/”, if available)
  let cleanedName = name.split('/').pop();
  // otherwise, fall back to the kit layer name
  cleanedName = !cleanedName ? name : cleanedName;
  return cleanedName;
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
   * @description Identifies the Kit-verified master symbol name of a symbol, or the linked
   * layer name of a layer, and adds the name to the layer’s `annotationText` settings object:
   * The identification is achieved by cross-referencing a symbol’s `symbolId` with the master
   * symbol instance, and then looking the name up in the connected Lingo Kit symbols, or by
   * matching the layer to the Lingo Kit list of layers.
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
    const kitLayers = this.documentData.userInfo()['com.lingoapp.lingo'].storage.hashes.layers;
    const kitLayerStyles = this.documentData.userInfo()['com.lingoapp.lingo'].storage.hashes.layerStyles;
    const kitTextStyles = this.documentData.userInfo()['com.lingoapp.lingo'].storage.hashes.textStyles;

    // convert to json to expose params and find the `symbolId`
    const layerJSON = fromNative(this.layer);
    const {
      id,
      sharedStyleId,
      symbolId,
    } = layerJSON;

    this.messenger.log(`Simple name for layer: ${this.layer.name()}`);

    // locate a symbol in Lingo
    if (symbolId) {
      // use the API to find the MasterSymbol instance based on the `symbolId`
      const masterSymbol = this.documentData.symbolWithID(symbolId);
      const masterSymbolJSON = fromNative(masterSymbol);
      const masterSymbolId = masterSymbolJSON.id;

      // parse the connected Lingo Kit data and find the corresponding Kit Symbol
      const kitSymbol = kitSymbols[masterSymbolId];

      // could not find a matching master symbol in the Lingo Kit
      if (!kitSymbol) {
        result.status = 'error';
        result.messages.log = `${masterSymbolId} was not found in a connected Lingo Kit`;
        result.messages.toast = '😢 This symbol could not be found in a connected Lingo Kit. Please make sure your Kits are up-to-date.';
        return result;
      }

      // take only the last segment of the name (after a “/”, if available)
      const textToSet = cleanName(kitSymbol.name);

      // set `annotationText` on the layer settings as the kit symbol name
      setAnnotationTextSettings(textToSet, 'component', this.layer);

      // log the official name alongside the original layer name and set as success
      result.status = 'success';
      result.messages.log = `Name in Lingo Kit for “${this.layer.name()}” is “${textToSet}”`;
      return result;
    }

    // locate a layer in Lingo
    const kitLayer = kitLayers[id];

    if (kitLayer) {
      // take only the last segment of the name (after a “/”, if available)
      const textToSet = cleanName(kitLayer.name);

      // set `annotationText` on the layer settings as the kit layer name
      setAnnotationTextSettings(textToSet, 'component', this.layer);

      // log the official name alongside the original layer name and set as success
      result.status = 'success';
      result.messages.log = `Name in Lingo Kit for “${this.layer.name()}” is “${textToSet}”`;
      return result;
    }

    // locate a shared style in Lingo
    if (sharedStyleId) {
      const kitStyle = kitLayerStyles[sharedStyleId] || kitTextStyles[sharedStyleId];

      if (kitStyle) {
        // take only the last segment of the name (after a “/”, if available)
        const textToSet = cleanName(kitStyle.name);

        // set `annotationText` on the layer settings as the kit layer name
        setAnnotationTextSettings(textToSet, 'style', this.layer);

        // log the official name alongside the original layer name and set as success
        result.status = 'success';
        result.messages.log = `Style Name in Lingo Kit for “${this.layer.name()}” is “${textToSet}”`;
        return result;
      }
    }

    // could not find a matching layer in the Lingo Kit
    result.status = 'error';
    result.messages.log = `${id} was not found in a connected Lingo Kit`;
    result.messages.toast = '😢 This layer could not be found in a connected Lingo Kit.';
    return result;
  }

  /**
   * @description Checks the layer’s settings object for the existence of `annotationText` and
   * and that `annotationType` is 'custom' (Component and Style annotations can be easily updated
   * and need to be rechecked each time, wheras Custom annotations do not.
   *
   * @kind function
   * @name hasCustomText
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  hasCustomText() {
    const result = INITIAL_RESULT_STATE;
    const layerSettings = Settings.layerSettingForKey(this.layer, PLUGIN_IDENTIFIER);

    // check for existing `annotationText`
    if (
      layerSettings
      && layerSettings.annotationText
      && (layerSettings.annotationType === 'custom')
    ) {
      result.status = 'success';
      result.messages.log = `Custom text set for “${this.layer.name()}” is “${layerSettings.annotationText}”`;
    } else {
      result.status = 'error';
      result.messages.log = `No custom text is set for “${this.layer.name()}”`;
    }

    return result;
  }

  /**
   * @description Uses Sketch’s `getInputFromUser` dialog box to allow the user to set custom
   * annotation text and adds the text to the layer’s settings object.
   *
   * @kind function
   * @name setText
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  setText() {
    const result = INITIAL_RESULT_STATE;
    const layerSettings = Settings.layerSettingForKey(this.layer, PLUGIN_IDENTIFIER);
    let initialValue = this.layer.name();

    if (layerSettings && layerSettings.annotationText) {
      initialValue = layerSettings.annotationText;
    }

    let customInput = null;
    getInputFromUser('Set the annotation’s text:', {
      type: INPUT_TYPE.string,
      initialValue,
    }, (error, value) => {
      customInput = {
        error,
        value,
      };
    });

    if (customInput.error) {
      // most likely the user canceled the input
      result.status = 'error';
      result.messages.log = 'Set text was canceled by user';
      return result;
    }

    const customText = customInput.value;
    // set `annotationText` on the layer settings as the custom text
    setAnnotationTextSettings(customText, 'custom', this.layer);

    // log the custom name alongside the original layer name and set as success
    result.status = 'success';
    result.messages.log = `Custom Text set for “${this.layer.name()}” is “${customText}”`;
    return result;
  }
}
