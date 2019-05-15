/* eslint-disable import/prefer-default-export */
import { toArray } from 'util';

/**
 * @description A conversion function to give us full js Array functions from an NSArray object.
 * Info {@link https://sketchplugins.com/d/113-how-to-iterate-through-selected-layers-in-sketchapi/8}
 *
 * @kind function
 * @name setArray
 * @param {Array} nsArray The NSArray-formatted array.
 * @returns {Array} Javascript Array.
 * @private
 */
export const setArray = nsArray => toArray(nsArray);
/* eslint-enable import/prefer-default-export */
