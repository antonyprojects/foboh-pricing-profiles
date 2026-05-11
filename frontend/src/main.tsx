import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import { store } from "@/redux/store";
import { App } from "@/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import "@/styles/global.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  // The HTML template includes a <div id="root">; if it's missing we
  // have a build problem, not a runtime one. Fail loudly so it doesn't
  // get diagnosed as "the app doesn't load".
  throw new Error('main: could not find <div id="root"> in document');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary area="application">
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
