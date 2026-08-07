import { registerRootComponent } from 'expo';
import { setupClientLogging } from './src/logging/init';
import App from './App';

setupClientLogging();

registerRootComponent(App);
