import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package, DollarSign, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import FiltrosPedidos from "../components/filtros/FiltrosPedidos";
import { Input } from "@/components/ui/input";

export default function PainelGerente() {
  const [filtros, setFiltros] = useState({});
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [ordenacaoPedidos, setOrdenacaoPedidos] = useState('data_recente');
  const [ordenacaoHistorico, setOrdenacaoHistorico] = useState('data_recente');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico'],
    queryFn: () => base44.entities.HistoricoFaturamento.list('-data_faturamento', 10000)
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-created_date', 10000)
  });

  const { data: solicitacoes = [], isLoading: loadingSolicitacoes } = useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => base44.entities.SolicitacaoFaturamento.list('-created_date', 10000)
  });

  let pedidosFiltrados = pedidos.filter(pedido => {
    // Ocultar volume = 0 se checkbox marcado
    if (filtros.ocultarVolume0 && (!pedido.volume_restante || pedido.volume_restante <= 0)) return false;
    
    if (filtros.numero_pedido && !pedido.numero_pedido.toLowerCase().includes(filtros.numero_pedido.toLowerCase())) return false;
    if (filtros.nome_cliente && !pedido.nome_cliente.toLowerCase().includes(filtros.nome_cliente.toLowerCase())) return false;
    if (filtros.nome_produto && !pedido.nome_produto.toLowerCase().includes(filtros.nome_produto.toLowerCase())) return false;
    if (filtros.status && filtros.status !== 'todos' && pedido.status !== filtros.status) return false;
    if (filtros.vendedor && !pedido.nome_vendedor.toLowerCase().includes(filtros.vendedor.toLowerCase())) return false;
    return true;
  });

  // Aplicar ordenação em pedidos
  pedidosFiltrados = [...pedidosFiltrados].sort((a, b) => {
    switch(ordenacaoPedidos) {
      case 'produto_az':
        return a.nome_produto.localeCompare(b.nome_produto);
      case 'produto_za':
        return b.nome_produto.localeCompare(a.nome_produto);
      case 'cliente_az':
        return a.nome_cliente.localeCompare(b.nome_cliente);
      case 'cliente_za':
        return b.nome_cliente.localeCompare(a.nome_cliente);
      case 'data_antiga':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'data_recente':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'valor_maior':
        return b.valor_total - a.valor_total;
      case 'valor_menor':
        return a.valor_total - b.valor_total;
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

  let historicoFiltrado = historico.filter(item => {
    if (!buscaHistorico) return true;
    const busca = buscaHistorico.toLowerCase();
    return (
      item.numero_pedido.toLowerCase().includes(busca) ||
      item.nome_cliente.toLowerCase().includes(busca) ||
      item.nome_produto.toLowerCase().includes(busca) ||
      item.nome_vendedor.toLowerCase().includes(busca)
    );
  });

  // Aplicar ordenação no histórico
  historicoFiltrado = [...historicoFiltrado].sort((a, b) => {
    switch(ordenacaoHistorico) {
      case 'produto_az':
        return a.nome_produto.localeCompare(b.nome_produto);
      case 'produto_za':
        return b.nome_produto.localeCompare(a.nome_produto);
      case 'cliente_az':
        return a.nome_cliente.localeCompare(b.nome_cliente);
      case 'cliente_za':
        return b.nome_cliente.localeCompare(a.nome_cliente);
      case 'data_antiga':
        return new Date(a.data_faturamento) - new Date(b.data_faturamento);
      case 'data_recente':
        return new Date(b.data_faturamento) - new Date(a.data_faturamento);
      case 'valor_maior':
        return b.valor_total - a.valor_total;
      case 'valor_menor':
        return a.valor_total - b.valor_total;
      default:
        return new Date(b.data_faturamento) - new Date(a.data_faturamento);
    }
  });

  const totalFaturado = historico.reduce((sum, item) => sum + (item.valor_total || 0), 0);
  const totalVolumeFaturado = historico.reduce((sum, item) => sum + (item.volume_faturado || 0), 0);
  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'pendente').length;
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente' || p.status === 'parcialmente_faturado').length;

  const getStatusBadge = (status) => {
    const configs = {
      pendente: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pendente' },
      parcialmente_faturado: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Parcial' },
      faturado: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Faturado' }
    };
    const config = configs[status] || configs.pendente;
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  // Verificar se o usuário tem permissão
  const permissao = user?.permissao_customizada || user?.role;
  if (user && permissao !== 'gerente' && permissao !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para acessar o Painel do Gerente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">Painel do Gerente</h1>
            <p className="text-gray-600">Visualização completa de todos os pedidos e faturamentos de todos os vendedores</p>
          </div>
          <BarChart3 className="w-16 h-16 text-blue-900 opacity-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Faturado</p>
                  <p className="text-3xl font-bold mt-2">R$ {totalFaturado.toFixed(2)}</p>
                </div>
                <DollarSign className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Volume Faturado</p>
                  <p className="text-3xl font-bold mt-2">{totalVolumeFaturado.toFixed(2)}</p>
                </div>
                <Package className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Solicitações Pendentes</p>
                  <p className="text-3xl font-bold mt-2">{solicitacoesPendentes}</p>
                </div>
                <TrendingUp className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Pedidos Pendentes</p>
                  <p className="text-3xl font-bold mt-2">{pedidosPendentes}</p>
                </div>
                <Package className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <FiltrosPedidos filtros={filtros} onFiltrosChange={setFiltros} />

        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-900">Ordenar Pedidos por</h3>
              <select
                value={ordenacaoPedidos}
                onChange={(e) => setOrdenacaoPedidos(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="data_recente">Data (Mais recente)</option>
                <option value="data_antiga">Data (Mais antiga)</option>
                <option value="produto_az">Produto (A-Z)</option>
                <option value="produto_za">Produto (Z-A)</option>
                <option value="cliente_az">Cliente (A-Z)</option>
                <option value="cliente_za">Cliente (Z-A)</option>
                <option value="valor_maior">Valor (Maior)</option>
                <option value="valor_menor">Valor (Menor)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <Package className="w-6 h-6" />
              Todos os Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data Pedido</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Vol. Total</TableHead>
                    <TableHead className="text-right">Vol. Restante</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPedidos ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        Carregando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : pedidosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidosFiltrados.map((pedido) => (
                      <TableRow key={pedido.id} className="hover:bg-blue-50 transition-colors">
                        <TableCell className="text-sm">
                          {pedido.data_pedido || format(new Date(pedido.created_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pedido.nome_cliente}</div>
                            <div className="text-xs text-gray-500">Cód: {pedido.codigo_cliente}</div>
                          </div>
                        </TableCell>
                        <TableCell>{pedido.nome_produto}</TableCell>
                        <TableCell className="text-right">{pedido.volume_total}</TableCell>
                        <TableCell className="text-right font-medium">{pedido.volume_restante}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          R$ {pedido.valor_total?.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md my-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-green-700">Ordenar Histórico por</h3>
              <select
                value={ordenacaoHistorico}
                onChange={(e) => setOrdenacaoHistorico(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="data_recente">Data (Mais recente)</option>
                <option value="data_antiga">Data (Mais antiga)</option>
                <option value="produto_az">Produto (A-Z)</option>
                <option value="produto_za">Produto (Z-A)</option>
                <option value="cliente_az">Cliente (A-Z)</option>
                <option value="cliente_za">Cliente (Z-A)</option>
                <option value="valor_maior">Valor (Maior)</option>
                <option value="valor_menor">Valor (Menor)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6" />
                Histórico de Faturamentos
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white opacity-70" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data Faturamento</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Faturado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistorico ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        Carregando histórico...
                      </TableCell>
                    </TableRow>
                  ) : historicoFiltrado.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        Nenhum faturamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoFiltrado.map((item) => (
                      <TableRow key={item.id} className="hover:bg-green-50 transition-colors">
                        <TableCell className="text-sm">
                          {format(new Date(item.data_faturamento), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{item.numero_pedido}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.nome_cliente}</div>
                            <div className="text-xs text-gray-500">Cód: {item.codigo_cliente}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.nome_produto}</TableCell>
                        <TableCell className="text-right font-medium">{item.volume_faturado}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          R$ {item.valor_total?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">{item.nome_vendedor}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.faturado_por}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}