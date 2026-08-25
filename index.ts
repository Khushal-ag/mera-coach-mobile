import { registerRootComponent } from 'expo';

import App from './App';

// Dev-only: Reactotron network / timeline inspector (not initialized in release).
if (__DEV__) {
  require('./src/ReactotronConfig');
}

registerRootComponent(App);
