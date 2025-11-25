import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart, Send, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import FiltrosPedidos from "../components/filtros/FiltrosPedidos";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PainelVendedor() {
  const [filtros, setFiltros] = useState({});
  const [ordenacao, setOrdenacao] = useState('-created_date');
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [volumeSolicitado, setVolumeSolicitado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-created_date', 10000)
  });

  const solicitarMutation = useMutation({
    mutationFn: async (dados) => {
      // Criar a solicitação
      await base44.entities.SolicitacaoFaturamento.create(dados);
      
      // Atualizar o volume_restante do pedido imediatamente
      const novoVolumeRestante = dados.volume_restante_atual - dados.volume_solicitado;
      await base44.entities.Pedido.update(dados.pedido_id, {
        volume_restante: novoVolumeRestante,
        status: novoVolumeRestante <= 0 ? 'faturado' : 'parcialmente_faturado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pedidos']);
      setPedidoSelecionado(null);
      setVolumeSolicitado('');
      setObservacoes('');
      setErro('');
    }
  });

  const isAdmin = user?.role === 'admin';

  let pedidosFiltrados = pedidos.filter(pedido => {
    // Remover pedidos sem produto
    if (!pedido.nome_produto || pedido.nome_produto.trim() === '') return false;
    
    // Ocultar volume = 0 se checkbox marcado
    if (filtros.ocultarVolume0 && (!pedido.volume_restante || pedido.volume_restante <= 0)) return false;
    
    if (pedido.status === 'faturado') return false;
    
    // Admin vê tudo
    if (isAdmin) {
      // Continua com os outros filtros abaixo
    } else {
      // Vendedor: verificar se tem código de vendedor atribuído
      if (user?.codigos_vendedor && user.codigos_vendedor.length > 0) {
        // Se tem códigos, filtrar por código do vendedor do pedido
        if (!user.codigos_vendedor.includes(pedido.codigo_vendedor)) return false;
      } else {
        // Se não tem código, filtrar por email (comportamento antigo)
        if (pedido.created_by !== user?.email) return false;
      }
    }
    
    if (filtros.numero_pedido && !pedido.numero_pedido.toLowerCase().includes(filtros.numero_pedido.toLowerCase())) return false;
    if (filtros.nome_cliente && !pedido.nome_cliente.toLowerCase().includes(filtros.nome_cliente.toLowerCase())) return false;
    if (filtros.codigo_cliente && !pedido.codigo_cliente.toLowerCase().includes(filtros.codigo_cliente.toLowerCase())) return false;
    if (filtros.nome_produto && !pedido.nome_produto.toLowerCase().includes(filtros.nome_produto.toLowerCase())) return false;
    if (filtros.status && filtros.status !== 'todos' && pedido.status !== filtros.status) return false;
    if (filtros.vendedor && !pedido.nome_vendedor?.toLowerCase().includes(filtros.vendedor.toLowerCase())) return false;
    
    if (filtros.data_inicial) {
      const dataPedido = new Date(pedido.created_date);
      const dataInicial = new Date(filtros.data_inicial);
      if (dataPedido < dataInicial) return false;
    }
    
    if (filtros.data_final) {
      const dataPedido = new Date(pedido.created_date);
      const dataFinal = new Date(filtros.data_final);
      dataFinal.setHours(23, 59, 59, 999);
      if (dataPedido > dataFinal) return false;
    }
    
    return true;
  });

  // Aplicar ordenação
  pedidosFiltrados = [...pedidosFiltrados].sort((a, b) => {
    switch(ordenacao) {
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

  const handleSolicitar = (pedido) => {
    setPedidoSelecionado(pedido);
    setVolumeSolicitado(pedido.volume_restante.toString());
    setObservacoes('');
    setErro('');
  };

  const confirmarSolicitacao = () => {
    const volume = parseFloat(volumeSolicitado);
    
    if (isNaN(volume) || volume <= 0) {
      setErro('Volume inválido');
      return;
    }
    
    if (volume > pedidoSelecionado.volume_restante) {
      setErro(`Volume solicitado excede o disponível (${pedidoSelecionado.volume_restante})`);
      return;
    }

    const valorTotal = volume * pedidoSelecionado.valor_unitario;

    solicitarMutation.mutate({
      pedido_id: pedidoSelecionado.id,
      numero_pedido: pedidoSelecionado.numero_pedido,
      codigo_cliente: pedidoSelecionado.codigo_cliente,
      nome_cliente: pedidoSelecionado.nome_cliente,
      nome_produto: pedidoSelecionado.nome_produto,
      volume_solicitado: volume,
      volume_restante_atual: pedidoSelecionado.volume_restante,
      embalagem: pedidoSelecionado.embalagem,
      valor_unitario: pedidoSelecionado.valor_unitario,
      valor_total: valorTotal,
      codigo_vendedor: pedidoSelecionado.codigo_vendedor,
      nome_vendedor: pedidoSelecionado.nome_vendedor,
      status: 'pendente',
      observacoes: observacoes
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      pendente: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pendente' },
      parcialmente_faturado: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Parcial' },
      faturado: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Faturado' }
    };
    const config = configs[status] || configs.pendente;
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">Painel do Vendedor</h1>
            <p className="text-gray-600">Gerencie suas solicitações de faturamento</p>
          </div>
          <Package className="w-16 h-16 text-blue-900 opacity-20" />
        </div>

        <FiltrosPedidos filtros={filtros} onFiltrosChange={setFiltros} />

        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-900">Ordenar por</h3>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
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
              <ShoppingCart className="w-6 h-6" />
              Carteira de Pedidos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-100 to-blue-50">
                    <TableHead className="font-bold">📅 Data</TableHead>
                    <TableHead className="font-bold">📝 Pedido</TableHead>
                    <TableHead className="font-bold">👤 Cliente</TableHead>
                    <TableHead className="font-bold">📦 Produto</TableHead>
                    <TableHead className="font-bold">🤝 Vendedor</TableHead>
                    <TableHead className="font-bold">📊 Emb.</TableHead>
                    <TableHead className="text-right font-bold">📈 Volume</TableHead>
                    <TableHead className="text-right font-bold">💰 Unit.</TableHead>
                    <TableHead className="text-right font-bold">💵 Total</TableHead>
                    <TableHead className="font-bold">⚡ Status</TableHead>
                    <TableHead className="text-center font-bold">⚙️ Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                        Carregando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : pedidosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-gray-500">
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
                        <TableCell>
                          <div className="font-semibold text-purple-900">{pedido.nome_produto || '⚠️ Sem produto'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-indigo-900">{pedido.nome_vendedor || '⚠️ Sem vendedor'}</div>
                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                              Cód: {pedido.codigo_vendedor || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{pedido.embalagem || 'UN'}</TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-bold text-lg text-blue-700">{pedido.volume_restante?.toFixed(2) || '0'}</div>
                            <div className="text-xs text-gray-500">Total: {pedido.volume_total?.toFixed(2) || '0'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">R$ {pedido.valor_unitario?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          R$ {pedido.valor_total?.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            onClick={() => handleSolicitar(pedido)}
                            size="sm"
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Solicitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!pedidoSelecionado} onOpenChange={() => setPedidoSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-blue-900">Solicitar Faturamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para solicitar o faturamento do pedido
            </DialogDescription>
          </DialogHeader>
          
          {pedidoSelecionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Pedido</p>
                  <p className="font-semibold">{pedidoSelecionado.numero_pedido}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-semibold">{pedidoSelecionado.nome_cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Produto</p>
                  <p className="font-semibold">{pedidoSelecionado.nome_produto}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendedor</p>
                  <p className="font-semibold">{pedidoSelecionado.nome_vendedor}</p>
                  <p className="text-xs text-gray-500">Cód: {pedidoSelecionado.codigo_vendedor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Volume Total do Pedido</p>
                  <p className="font-semibold text-blue-700">{pedidoSelecionado.volume_total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Volume Disponível</p>
                  <p className="font-semibold text-green-700">{pedidoSelecionado.volume_restante}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Volume a Faturar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={volumeSolicitado}
                    onChange={(e) => setVolumeSolicitado(e.target.value)}
                    placeholder="Digite o volume"
                    min="0"
                    max={pedidoSelecionado.volume_restante}
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações sobre esta solicitação"
                    rows={3}
                  />
                </div>

                {volumeSolicitado && !isNaN(parseFloat(volumeSolicitado)) && (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-600">Valor Total da Solicitação</p>
                      <p className="text-2xl font-bold text-green-700">
                        R$ {(parseFloat(volumeSolicitado) * pedidoSelecionado.valor_unitario).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-600">Volume que restará após faturamento</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {(pedidoSelecionado.volume_restante - parseFloat(volumeSolicitado)).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ({pedidoSelecionado.volume_restante} disponível - {parseFloat(volumeSolicitado).toFixed(2)} a faturar)
                      </p>
                    </div>
                  </div>
                )}

                {erro && (
                  <Alert className="border-red-500 bg-red-50">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">{erro}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPedidoSelecionado(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarSolicitacao}
              disabled={solicitarMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {solicitarMutation.isPending ? (
                <>Enviando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}