import sketch from 'sketch';
// documentation: https://developer.sketchapp.com/reference/api/

export const helloWorld = () => {
  sketch.UI.message('It’s alive 🙌');
};

export const whatAmI = () => {
  sketch.UI.message('I will identify selected things 💅');
};
