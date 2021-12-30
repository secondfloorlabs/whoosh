import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import 'src/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from 'src/App';
import reportWebVitals from 'src/reportWebVitals';

import { createStore, Store } from 'redux';
import { Provider } from 'react-redux';
import reducer from 'src/store/reducer';
import { AuthProvider } from 'src/provider/AuthProvider';

Sentry.init({
  dsn: 'https://9f55d53bfe644a7e82ce95ad8e4b1cef@o1098746.ingest.sentry.io/6123114',
  integrations: [new Integrations.BrowserTracing()],
  environment: process.env.NODE_ENV,
  autoSessionTracking: true,
  tracesSampleRate: 1.0, // capture 100% of transactions
});

const store: Store<TokenState, TokenAction> & {
  dispatch: DispatchType;
} = createStore(reducer);

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results. Learn more: https://bit.ly/CRA-vitals
declare let ga: Function;
function sendToAnalytics({ id, name, value }: { id: string; name: string; value: number }) {
  ga('send', 'event', {
    eventCategory: 'Web Vitals',
    eventAction: name,
    eventValue: Math.round(name === 'CLS' ? value * 1000 : value), // values must be integers
    eventLabel: id, // id unique to current page load
    nonInteraction: true, // avoids affecting bounce rate
  });
}
reportWebVitals(sendToAnalytics);
