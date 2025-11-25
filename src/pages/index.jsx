import Layout from "./Layout.jsx";

import PainelVendedor from "./PainelVendedor";

import PainelFaturamento from "./PainelFaturamento";

import PainelGerente from "./PainelGerente";

import GerenciarPedidos from "./GerenciarPedidos";

import CorrigirVendedores from "./CorrigirVendedores";

import ConverterCodigosVendedores from "./ConverterCodigosVendedores";

import GerenciarUsuarios from "./GerenciarUsuarios";

import MeusPedidos from "./MeusPedidos";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    PainelVendedor: PainelVendedor,
    
    PainelFaturamento: PainelFaturamento,
    
    PainelGerente: PainelGerente,
    
    GerenciarPedidos: GerenciarPedidos,
    
    CorrigirVendedores: CorrigirVendedores,
    
    ConverterCodigosVendedores: ConverterCodigosVendedores,
    
    GerenciarUsuarios: GerenciarUsuarios,
    
    MeusPedidos: MeusPedidos,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<PainelVendedor />} />
                
                
                <Route path="/PainelVendedor" element={<PainelVendedor />} />
                
                <Route path="/PainelFaturamento" element={<PainelFaturamento />} />
                
                <Route path="/PainelGerente" element={<PainelGerente />} />
                
                <Route path="/GerenciarPedidos" element={<GerenciarPedidos />} />
                
                <Route path="/CorrigirVendedores" element={<CorrigirVendedores />} />
                
                <Route path="/ConverterCodigosVendedores" element={<ConverterCodigosVendedores />} />
                
                <Route path="/GerenciarUsuarios" element={<GerenciarUsuarios />} />
                
                <Route path="/MeusPedidos" element={<MeusPedidos />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}