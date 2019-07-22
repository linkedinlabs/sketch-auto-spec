import { fromNative, Settings } from 'sketch';
import { updateArray } from './Tools';
import { COLORS, PLUGIN_IDENTIFIER } from './constants';

/**
 * @description A list of the unique keys that match to a migration function.
 * The keys are timestamps. To generate a new key: `new Date().getTime();`
 *
 * @kind constant
 * @name migrationKeys
 * @type {Array}
 */
const migrationKeys = [
  1563832001257,
  1561504830674,
  1561503084281,
];

/**
 * @description A helper function to extract the file creation date from a Sketch
 * file. If no creation date can be found, it assumes a new temp (un-saved) file
 * and assigns the creation date to the current date/time.
 *
 * @kind function
 * @name documentCreationTimestamp
 *
 * @param {Object} document The Sketch document to erxtract the creation date from.
 * @returns {string} Returns a string with the creation date/time as a timestamp.
 * @private
 */
const documentCreationTimestamp = (document) => {
  // assume brand new file
  let creationTimestamp = new Date().getTime();

  // if the file has been saved before, it will have a `fileURL`
  const fileURLObj = document.sketchObject.fileURL();

  // file is not brand new, get its creation date
  if (fileURLObj) {
    const fileManager = NSFileManager.defaultManager(); // eslint-disable-line no-undef

    // get the file attributes from macOS and then the creation date
    const attributes = fileManager.attributesOfItemAtPath_error_(fileURLObj.path(), nil); // eslint-disable-line no-underscore-dangle, no-undef, max-len
    const fileCreationDate = attributes.fileCreationDate();

    // take '2019-05-16 17:28:59 +0000' and format as '2019-05-16T17:28:59'
    const dateForParsing = fileCreationDate.toString().split(' +')[0].split(' ').join('T');

    // i.e. 1558027739000
    creationTimestamp = Date.parse(dateForParsing);
  }

  return creationTimestamp;
};

/**
 * @description A class to handle housekeeping tasks on Sketch, plugin, document, or
 * layer Settings objects.
 *
 * @class
 * @name Housekeeper
 *
 * @constructor
 *
 * @property document The Sketch document that contains the layer.
 * @property messenger An instance of the Messenger class.
 */
export default class Housekeeper {
  constructor({ in: document, messenger }) {
    this.document = document;
    this.messenger = messenger;
  }

  /**
   * @description Used to move plugin settings to document-level settings based on a set of
   * keys used for comparisons.
   *
   * @kind function
   * @name fromPluginToDocument
   *
   * @param {Object} comparisonKeys An object containing a `mainKey` and `secondaryKey` used.
   * @param {Object} pluginSettings An object containing the plugin settings.
   * @param {Object} documentSettings An object containing the document settings.
   *
   * @returns {Object} Returns an object containing (potentially) updated `documentSettings` and
   * `pluginSettings` objects, and a `changed` flag indicating updates.
   */
  fromPluginToDocument(comparisonKeys, pluginSettings, documentSettings = {}) {
    const { mainKey, secondaryKey, newMainKey } = comparisonKeys;
    const mainKeyToUse = newMainKey || mainKey;
    const newDocumentSettings = documentSettings;
    let newPluginSettings = pluginSettings;
    let settingsChanged = false;

    // set up placeholder in `documentSettings` for the main key
    if (!newDocumentSettings[mainKey]) {
      newDocumentSettings[mainKey] = [];
    }

    // iterate through each `mainKey`
    pluginSettings[mainKey].forEach((layerIdSet) => {
      const { id } = layerIdSet;
      const secondaryId = layerIdSet[secondaryKey];

      // make sure the primary `id` layer actually exists
      const primaryLayer = this.document.getLayerWithID(id);

      // make sure the `secondaryKey` paired layer actually exists
      const pairedLayer = this.document.getLayerWithID(secondaryId);

      if (primaryLayer && pairedLayer) {
        // check if this `primaryLayer` has already been migrated
        const existingItemIndex = newDocumentSettings[mainKeyToUse].findIndex(
          foundItem => (foundItem.id === id),
        );
        if (existingItemIndex < 0) {
          // add the `layerIdSet` to the document settings
          newDocumentSettings[mainKeyToUse].push(layerIdSet);

          // remove the `layerIdSet` from the plugin settings
          newPluginSettings = updateArray(
            mainKey,
            layerIdSet,
            newPluginSettings,
            'remove',
          );

          // set the `changed` flag
          settingsChanged = true;
        }
      }
    });
    return {
      documentSettings: newDocumentSettings,
      pluginSettings: newPluginSettings,
      changed: settingsChanged,
    };
  }

  /**
   * @description A helper function to set up the `documentSettings` structure for migrations.
   *
   * @kind function
   * @name initializeMigrationsSchema
   */
  initializeMigrationsSchema() {
    let documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);

    if (!documentSettings) {
      documentSettings = {};
    }

    if (!documentSettings.migrations) {
      documentSettings.migrations = [];

      Settings.setDocumentSettingForKey(
        this.document,
        PLUGIN_IDENTIFIER,
        documentSettings,
      );
    }
    return null;
  }

  /**
   * @description Iterates through the list of available migrations. Skips any migration
   * older than the creation of the Sketch file. And skips any migration that has already
   * been run on the file. Remaining migrations are run in order (oldest-to-newest) and then
   * marked as run, if successful, so that they do not run twice.
   *
   * @kind function
   * @name runMigrations
   */
  runMigrations() {
    this.initializeMigrationsSchema();

    // get the file creation date as a timestamp
    const fileTimestamp = documentCreationTimestamp(this.document);

    // iterrate through available migrations, oldest to newest
    migrationKeys.sort().forEach((migrationKey) => {
      // don’t bother with a migration that is older than the creation of the file
      if (fileTimestamp > migrationKey) {
        return null;
      }

      // assume it will not run
      let runMigration = false;

      // some migrations will likely update document settings, so do a fresh lookup
      const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);

      // check to see if the migration has already been run; enable if it has not
      if (!documentSettings.migrations.includes(migrationKey)) {
        runMigration = true;
      }

      if (runMigration) {
        // run the migration
        const migrationResult = this[`migration${migrationKey}`]();

        // only mark the migration as run if successful
        if (migrationResult.status === 'success') {
          documentSettings.migrations.push(migrationKey);

          Settings.setDocumentSettingForKey(
            this.document,
            PLUGIN_IDENTIFIER,
            documentSettings,
          );
        }

        // log any output
        if (migrationResult.messages.log) {
          const logType = migrationResult.status === 'success' ? null : 'error';
          this.messenger.log(migrationResult.messages.log, logType);
        }
      }
      return null;
    });

    return null;
  }

  /**
   * @description Migrates any spec layers using the old color palette to the new
   * set of colors. This migration does not distinguish custom/component annotations.
   * [More info]{@link https://github.com/linkedinlabs/sketch-auto-spec/pull/31}
   *
   * @kind function
   * @name migration1563832001257
   *
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  migration1563832001257() {
    const result = {
      status: null,
      messages: {
        toast: null,
        log: null,
      },
    };
    const migrationKey = 1563832001257;
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);

    // this app does not have any plugin settings; no further work needed
    if (!documentSettings || !documentSettings.containerGroups) {
      result.status = 'success';
      result.messages.log = `Migration: Running ${migrationKey} was unnecessary`;
      return result;
    }

    // default the changes flag to false
    let colorsUpdated = false;

    // helper function to update the color of any layer fills
    const updateColor = (layer, newColor, opacity = 'ff') => {
      if (layer.style && layer.style.fills) {
        layer.style.fills.forEach((fill) => {
          if (fill.color) {
            const currentColor = fill.color.match(/.{1,7}/g)[0];
            if (currentColor !== newColor) {
              fill.color = `${newColor}${opacity}`; // eslint-disable-line no-param-reassign
              colorsUpdated = true;
            }
          }
          return null;
        });
      }
    };

    // helper function to iterate through all children of a group layer (even sub-groups)
    // and call the appropriate instance of `updateColor`
    const updateChildrenColors = (children, groupType) => {
      const nativeLayers = children();
      nativeLayers.forEach((nativeLayer) => {
        const layer = fromNative(nativeLayer);

        if (layer.type === 'ShapePath') {
          switch (groupType) {
            case 'component':
            case 'custom':
            case 'measure':
            case 'style':
              updateColor(layer, COLORS[groupType]);
              break;
            case 'bounding':
              updateColor(layer, COLORS.style, '4d');
              break;
            default:
              return null;
          }
        }
        return null;
      });
    };

    this.messenger.log('Run “labeledLayers” settings migration…');

    documentSettings.containerGroups.forEach((containerGroup) => {
      const boundingBoxContainer = this.document.getLayerWithID(
        containerGroup.boundingInnerGroupId,
      );
      const componentBoxContainer = this.document.getLayerWithID(
        containerGroup.componentInnerGroupId,
      );
      const measurementContainer = this.document.getLayerWithID(
        containerGroup.measurementInnerGroupId,
      );
      const styleContainer = this.document.getLayerWithID(
        containerGroup.styleInnerGroupId,
      );

      // convert component boxes
      if (componentBoxContainer && componentBoxContainer.sketchObject.children) {
        updateChildrenColors(componentBoxContainer.sketchObject.children, 'component');
      }

      // convert bounding boxes
      if (boundingBoxContainer && boundingBoxContainer.sketchObject.children) {
        updateChildrenColors(boundingBoxContainer.sketchObject.children, 'bounding');
      }

      // convert measurement annotations
      if (measurementContainer && measurementContainer.sketchObject.children) {
        updateChildrenColors(measurementContainer.sketchObject.children, 'measure');
      }

      // convert style annotations
      if (styleContainer && styleContainer.sketchObject.children) {
        updateChildrenColors(styleContainer.sketchObject.children, 'style');
      }
    });

    if (colorsUpdated) {
      result.messages.log = `Migration: Ran ${migrationKey} (update colors) and colors were updated`;
    } else {
      result.messages.log = `Migration: Ran ${migrationKey} (update colors) and colors were not updated`;
    }

    result.status = 'success';
    return result;
  }

  /**
   * @description Migrates any `labeledLayers` recorded in plugin settings into local document
   * settings as `annotatedLayeres`. It first checks to make sure the layer actually exists in
   * the document before “moving” the representation in settings.
   * [More info]{@link https://github.com/linkedinlabs/sketch-auto-spec/pull/9}
   *
   * @kind function
   * @name migration1561504830674
   *
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  migration1561504830674() {
    const result = {
      status: null,
      messages: {
        toast: null,
        log: null,
      },
    };
    const migrationKey = 1561504830674;
    const pluginSettings = Settings.settingForKey(PLUGIN_IDENTIFIER);
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);

    let settingsToUpdate = {
      pluginSettings,
      documentSettings,
      changed: false,
    };

    // this app does not have any plugin settings; no further work needed
    if (!pluginSettings) {
      result.status = 'success';
      result.messages.log = `Migration: Running ${migrationKey} was unnecessary`;
      return result;
    }

    // there are un-migrated `labeledLayers` in the plugin settings; check them
    if (pluginSettings.labeledLayers && pluginSettings.labeledLayers.length > 0) {
      const comparisonKeys = {
        mainKey: 'labeledLayers',
        newMainKey: 'annotatedLayers',
        secondaryKey: 'originalId',
      };
      this.messenger.log('Run “labeledLayers” settings migration…');

      // if a `labeledLayer` in the plugin settings matches a layer in the docoment,
      // it will be migrated and removed from `pluginSettings`
      settingsToUpdate = this.fromPluginToDocument(
        comparisonKeys,
        settingsToUpdate.pluginSettings,
        settingsToUpdate.documentSettings,
      );
    }

    // update the document settings, if necessary
    if (settingsToUpdate.changed) {
      Settings.setDocumentSettingForKey(
        this.document,
        PLUGIN_IDENTIFIER,
        settingsToUpdate.documentSettings,
      );
      Settings.setSettingForKey(PLUGIN_IDENTIFIER, settingsToUpdate.pluginSettings);
      result.messages.log = `Migration: ${migrationKey} (labeledLayers) Run; settings were updated`;
    } else {
      result.messages.log = `Migration: ${migrationKey} (labeledLayers) Run; settings were not updated`;
    }

    result.status = 'success';
    return result;
  }

  /**
   * @description Migrates any `containerGroups` recorded in plugin settings into local document
   * settings. It first checks to make sure the layer actually exists in
   * the document before “moving” the representation in settings.
   * [More info]{@link https://github.com/linkedinlabs/sketch-auto-spec/pull/9}
   *
   * @kind function
   * @name migration1561504830674
   *
   * @returns {Object} A result object containing success/error status and log/toast messages.
   */
  migration1561503084281() {
    const result = {
      status: null,
      messages: {
        toast: null,
        log: null,
      },
    };
    const migrationKey = 1561503084281;
    const pluginSettings = Settings.settingForKey(PLUGIN_IDENTIFIER);
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);

    let settingsToUpdate = {
      pluginSettings,
      documentSettings,
      changed: false,
    };

    // this app does not have any plugin settings; no further work needed
    if (!pluginSettings) {
      result.status = 'success';
      result.messages.log = `Migration: Running ${migrationKey} was unnecessary`;
      return result;
    }

    // there are un-migrated `containerGroups` in the plugin settings; check them
    if (pluginSettings.containerGroups && pluginSettings.containerGroups.length > 0) {
      const comparisonKeys = {
        mainKey: 'containerGroups',
        secondaryKey: 'artboardId',
      };
      this.messenger.log(`Run “containerGroups” (${migrationKey}) settings migration…`);

      // if a `containerGroup` in the plugin settings matches a layer in the docoment,
      // it will be migrated and removed from `pluginSettings`
      settingsToUpdate = this.fromPluginToDocument(
        comparisonKeys,
        settingsToUpdate.pluginSettings,
        settingsToUpdate.documentSettings,
      );
    }

    // update the document settings, if necessary
    if (settingsToUpdate.changed) {
      Settings.setDocumentSettingForKey(
        this.document,
        PLUGIN_IDENTIFIER,
        settingsToUpdate.documentSettings,
      );
      Settings.setSettingForKey(PLUGIN_IDENTIFIER, settingsToUpdate.pluginSettings);
      result.messages.log = `Migration: ${migrationKey} (containerGroups) Run; settings were updated`;
    } else {
      result.messages.log = `Migration: ${migrationKey} (containerGroups) Run; settings were not updated`;
    }

    result.status = 'success';
    return result;
  }
}
