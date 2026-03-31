/**
 * @format
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './App';
const { name: appName } = require('./app.json');

AppRegistry.registerComponent(appName, () => App);
