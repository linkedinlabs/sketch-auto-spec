import { Settings } from 'sketch';
import { updateArray } from './Tools';
import { PLUGIN_IDENTIFIER } from './constants';

/** WIP
 * @description A class to handle traversing an array of selected items and return useful items
 * (parent layer, artboard, document, etc). It will also find items based on ID (or timestamp).
 *
 * @class
 * @name Housekeeper
 *
 * @constructor
 *
 * @property selectionArray The array of selected items.
 */
export default class Housekeeper {
  constructor({ in: document, messenger }) {
    this.document = document;
    this.messenger = messenger;
  }

  moveContainerGroupsToDocument(pluginSettings, documentSettings) {
    let settingsChanged = false;
    let newDocumentSettings = documentSettings;
    let newPluginSettings = pluginSettings;
    if (!newDocumentSettings) {
      newDocumentSettings = {
        containerGroups: [],
      };
    }

    if (!newDocumentSettings.containerGroups) {
      newDocumentSettings.containerGroups = [];
    }

    // iterate through each `containerGroup`
    pluginSettings.containerGroups.forEach((containerGroupIdSet) => {
      const { artboardId, id } = containerGroupIdSet;

      // make sure the `artboard` layer actually exists
      const artboard = this.document.getLayerWithID(artboardId);

      // make sure the `containerGroup` layer actually exists
      const containerGroup = this.document.getLayerWithID(id);

      if (artboard && containerGroup) {
        // check if this `containerGroup` has already been migrated
        const existingItemIndex = newDocumentSettings.containerGroups.findIndex(
          foundItem => (foundItem.id === id),
        );
        if (existingItemIndex < 0) {
          newDocumentSettings.containerGroups.push({
            artboardId,
            id,
          });

          newPluginSettings = updateArray(
            'containerGroups',
            containerGroupIdSet,
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

  /** WIP
   * @description Returns the first item in the array.
   *
   * @kind function
   * @name first
   * @returns {Object} The first layer item in the array.
   */
  runMigrations() {
    const pluginSettings = Settings.settingForKey(PLUGIN_IDENTIFIER);
    const documentSettings = Settings.documentSettingForKey(this.document, PLUGIN_IDENTIFIER);
    let settingsToUpdate = { changed: false };

    if (!pluginSettings) {
      return null;
    }

    if (pluginSettings.containerGroups && pluginSettings.containerGroups.length > 0) {
      this.messenger.log('Run settings migration…');
      settingsToUpdate = this.moveContainerGroupsToDocument(pluginSettings, documentSettings);
    }

    if (settingsToUpdate.changed) {
      Settings.setDocumentSettingForKey(
        this.document,
        PLUGIN_IDENTIFIER,
        settingsToUpdate.documentSettings,
      );
      Settings.setSettingForKey(PLUGIN_IDENTIFIER, settingsToUpdate.pluginSettings);
      this.messenger.log('Migration: settings were updated');
    }
    return null;
  }
}
