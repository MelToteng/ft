import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { SharedShoppingListView } from './components/shopping/SharedShoppingListView';

const AppContainer = () => {
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/list\/([a-zA-Z0-9]+)$/);

    if (shareMatch) {
        const token = shareMatch[1];
        return <SharedShoppingListView token={token} />;
    }

    return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <AppContainer />
    </React.StrictMode>
);
