import { Settings } from 'sketch';
import { updateArray } from './Tools';
import { PLUGIN_IDENTIFIER } from './constants';

// WIP
// add new migrations to the top
// `new Date().getTime();` for timestamp
const migrationKeys = [
  1561504830674,
  1561503084281,
];

// WIP
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
   * @name runMigrations
   *
   * @param {Object} comparisonKeys An object containing a `mainKey` and `secondaryKey` used
   * @param {Object} pluginSettings An object containing the plugin settings.
   * @param {Object} documentSettings An object containing the document settings.
   * in addition to `id` to compare layer ID sets between plugin and document settings.
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

  /** WIP
   * @description Checks for the existence of certain keys in the plugin Settings (`containerGroups`
   * and `labeledLayers`) and runs any necessary migrations.
   *
   * @kind function
   * @name runMigrations
   */
  runMigrations() {
    this.initializeMigrationsSchema();

    // get the file creation date as a timestamp
    const fileTimestamp = documentCreationTimestamp(this.document);

    // iterrate through available migrations
    migrationKeys.forEach((migrationKey) => {
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

  // migrate the `labeledLayers` into local document settings as `annotatedLayeres`
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

  // migrate the `containerGroups` into local document settings
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
