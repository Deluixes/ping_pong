import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)

// Register service worker for push notifications only (no asset caching)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-custom.js')
}
