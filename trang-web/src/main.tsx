import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import QuanTri from './QuanTri.js';
import './style.css';
const laQuanTri = window.location.pathname === '/quan-tri' || window.location.pathname === '/quan-tri/';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{laQuanTri ? <QuanTri /> : <App />}</React.StrictMode>);
