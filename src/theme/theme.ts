import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0b3d91',
    secondary: '#4f6bed',
    background: '#f6f8fb',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8ab4f8',
    secondary: '#4f6bed',
    background: '#0f172a',
  },
};
