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
import { ShoppingCart, Send, Package, AlertCircle, CheckCircle2, User } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MeusPedidos() {
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
      await base44.entities.SolicitacaoFaturamento.create(dados);
      
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

  // Filtrar apenas pedidos do vendedor logado
  let meusPedidos = pedidos.filter(pedido => {
    // Remover pedidos sem produto
    if (!pedido.nome_produto || pedido.nome_produto.trim() === '') return false;
    if (pedido.status === 'faturado') return false;
    
    // Filtrar apenas pedidos deste vendedor
    if (user?.codigos_vendedor && user.codigos_vendedor.length > 0) {
      if (!user.codigos_vendedor.includes(pedido.codigo_vendedor)) return false;
    } else {
      if (pedido.created_by !== user?.email) return false;
    }
    
    return true;
  });

  // Aplicar filtros de busca
  meusPedidos = meusPedidos.filter(pedido => {
    // Ocultar volume = 0 se checkbox marcado
    if (filtros.ocultarVolume0 && (!pedido.volume_restante || pedido.volume_restante <= 0)) return false;
    
    if (filtros.numero_pedido && !pedido.numero_pedido.toLowerCase().includes(filtros.numero_pedido.toLowerCase())) return false;
    if (filtros.nome_cliente && !pedido.nome_cliente.toLowerCase().includes(filtros.nome_cliente.toLowerCase())) return false;
    if (filtros.nome_produto && !pedido.nome_produto.toLowerCase().includes(filtros.nome_produto.toLowerCase())) return false;
    if (filtros.status && filtros.status !== 'todos' && pedido.status !== filtros.status) return false;
    return true;
  });

  // Aplicar ordenação
  meusPedidos = [...meusPedidos].sort((a, b) => {
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

  const valorTotal = meusPedidos.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  const volumeTotal = meusPedidos.reduce((sum, p) => sum + (p.volume_restante || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">Meus Pedidos</h1>
            <p className="text-gray-600">Vendedor: <span className="font-semibold text-blue-700">{user?.full_name || user?.email}</span></p>
            {user?.codigos_vendedor && user.codigos_vendedor.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {user.codigos_vendedor.map((codigo, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {codigo}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <User className="w-16 h-16 text-blue-900 opacity-20" />
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total de Pedidos</p>
                  <p className="text-3xl font-bold mt-2">{meusPedidos.length}</p>
                </div>
                <Package className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Valor Total</p>
                  <p className="text-3xl font-bold mt-2">R$ {valorTotal.toFixed(2)}</p>
                </div>
                <ShoppingCart className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Volume Total</p>
                  <p className="text-3xl font-bold mt-2">{volumeTotal.toFixed(2)}</p>
                </div>
                <Package className="w-12 h-12 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900">Filtros</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtros.ocultarVolume0 || false}
                  onChange={(e) => setFiltros({...filtros, ocultarVolume0: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Ocultar volume = 0</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="🔍 Buscar por número do pedido"
                value={filtros.numero_pedido || ''}
                onChange={(e) => setFiltros({...filtros, numero_pedido: e.target.value})}
                className="border-2 border-gray-300 focus:border-blue-500"
              />
              
              <Input
                placeholder="🔍 Buscar por cliente"
                value={filtros.nome_cliente || ''}
                onChange={(e) => setFiltros({...filtros, nome_cliente: e.target.value})}
                className="border-2 border-gray-300 focus:border-blue-500"
              />

              <Input
                placeholder="🔍 Buscar por produto"
                value={filtros.nome_produto || ''}
                onChange={(e) => setFiltros({...filtros, nome_produto: e.target.value})}
                className="border-2 border-gray-300 focus:border-blue-500"
              />

              <Select
                value={filtros.status || 'todos'}
                onValueChange={(value) => setFiltros({...filtros, status: value})}
              >
                <SelectTrigger className="border-2 border-gray-300">
                  <SelectValue placeholder="📊 Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcialmente_faturado">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(filtros.numero_pedido || filtros.nome_cliente || filtros.nome_produto || (filtros.status && filtros.status !== 'todos')) && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <span className="text-sm font-medium text-blue-900">✅ Filtros ativos</span>
                <button
                  onClick={() => setFiltros({})}
                  className="text-sm text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ordenação */}
        <Card className="border-0 shadow-md">
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

        {/* Tabela de Pedidos */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              Minha Carteira de Pedidos
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
                      <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                        Carregando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : meusPedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <AlertCircle className="w-12 h-12 text-gray-400" />
                          <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
                          <p className="text-sm text-gray-400">Você não possui pedidos ativos no momento</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    meusPedidos.map((pedido) => (
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
                          <div className="font-semibold text-purple-900">{pedido.nome_produto}</div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{pedido.embalagem || 'UN'}</TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-bold text-lg text-blue-700">{pedido.volume_restante?.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Total: {pedido.volume_total?.toFixed(2)}</div>
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

      {/* Dialog de Solicitação */}
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
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-gray-600">Valor Total da Solicitação</p>
                    <p className="text-2xl font-bold text-green-700">
                      R$ {(parseFloat(volumeSolicitado) * pedidoSelecionado.valor_unitario).toFixed(2)}
                    </p>
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