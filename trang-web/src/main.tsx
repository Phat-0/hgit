import React,{lazy,Suspense} from 'react';
import { createRoot } from 'react-dom/client';
const App=lazy(()=>import('./App.js'));
const QuanTri=lazy(()=>import('./QuanTri.js'));
import './style.css';
import './bang-du-lieu.css';
import './nen-chung.css';
const laQuanTri = window.location.pathname === '/quan-tri' || window.location.pathname === '/quan-tri/';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Suspense fallback={<div role="status" style={{padding:32,textAlign:"center",color:"#9273aa"}}>Đang chuẩn bị không gian của bạn…</div>}>{laQuanTri ? <QuanTri /> : <App />}</Suspense></React.StrictMode>);
