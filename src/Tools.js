import { toArray } from 'util';

// conversion function to give us full js Array functions from an NSArray object
export const setArray = nsArray => toArray(nsArray);

export const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = parseInt(hex.slice(7, 9), 16) / 255;

  const rgbValue = `rgba(${r}, ${g}, ${b}, ${a * 100}%`;
  return rgbValue;
};
