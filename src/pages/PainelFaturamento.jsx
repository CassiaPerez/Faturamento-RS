import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, CheckCircle2, XCircle, Package, AlertTriangle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PainelFaturamento() {
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [acao, setAcao] = useState(null);
  const [observacoes, setObservacoes] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('data_recente');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => base44.entities.SolicitacaoFaturamento.list('-created_date', 10000)
  });

  const processarMutation = useMutation({
    mutationFn: async ({ solicitacao, acao, observacoes }) => {
      const agora = new Date().toISOString();
      
      if (acao === 'aprovar') {
        // Apenas aprovar (volume já foi descontado na solicitação)
        await base44.entities.SolicitacaoFaturamento.update(solicitacao.id, {
          status: 'aprovado',
          data_aprovacao: agora,
          aprovado_por: user?.email,
          observacoes: observacoes || solicitacao.observacoes
        });
      } else if (acao === 'rejeitar') {
        // Ao rejeitar, devolver o volume ao pedido
        const pedido = await base44.entities.Pedido.filter({ id: solicitacao.pedido_id });
        if (pedido.length > 0) {
          const pedidoAtual = pedido[0];
          const volumeDevolvido = pedidoAtual.volume_restante + solicitacao.volume_solicitado;
          
          await base44.entities.Pedido.update(pedidoAtual.id, {
            volume_restante: volumeDevolvido,
            status: volumeDevolvido >= pedidoAtual.volume_total ? 'pendente' : 'parcialmente_faturado'
          });
        }
        
        await base44.entities.SolicitacaoFaturamento.update(solicitacao.id, {
          status: 'rejeitado',
          observacoes: observacoes || solicitacao.observacoes
        });
      } else if (acao === 'faturar') {
        // Ao faturar, só registra no histórico (volume já foi descontado na aprovação)
        await base44.entities.SolicitacaoFaturamento.update(solicitacao.id, {
          status: 'faturado'
        });

        await base44.entities.HistoricoFaturamento.create({
          pedido_id: solicitacao.pedido_id,
          solicitacao_id: solicitacao.id,
          numero_pedido: solicitacao.numero_pedido,
          codigo_cliente: solicitacao.codigo_cliente,
          nome_cliente: solicitacao.nome_cliente,
          nome_produto: solicitacao.nome_produto,
          volume_faturado: solicitacao.volume_solicitado,
          embalagem: solicitacao.embalagem,
          valor_unitario: solicitacao.valor_unitario,
          valor_total: solicitacao.valor_total,
          codigo_vendedor: solicitacao.codigo_vendedor,
          nome_vendedor: solicitacao.nome_vendedor,
          data_faturamento: agora,
          faturado_por: user?.email
        });

        // Verifica se o pedido está 100% faturado para remover
        const pedido = await base44.entities.Pedido.filter({ id: solicitacao.pedido_id });
        if (pedido.length > 0) {
          const pedidoAtual = pedido[0];
          
          if (pedidoAtual.volume_restante <= 0) {
            // Pedido 100% faturado - REMOVER da base
            await base44.entities.Pedido.delete(pedidoAtual.id);
            console.log(`🗑️ Pedido ${pedidoAtual.numero_pedido} removido (100% faturado)`);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes']);
      queryClient.invalidateQueries(['pedidos']);
      setSolicitacaoSelecionada(null);
      setAcao(null);
      setObservacoes('');
    }
  });

  let solicitacoesFiltradas = solicitacoes.filter(sol => {
    // Faturamento só vê solicitações pendentes e aprovadas (não faturadas nem rejeitadas)
    if (sol.status === 'faturado' || sol.status === 'rejeitado') return false;
    return true;
  });

  // Aplicar ordenação
  solicitacoesFiltradas = [...solicitacoesFiltradas].sort((a, b) => {
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

  const handleAcao = (solicitacao, tipoAcao) => {
    setSolicitacaoSelecionada(solicitacao);
    setAcao(tipoAcao);
    setObservacoes('');
  };

  const confirmarAcao = () => {
    processarMutation.mutate({
      solicitacao: solicitacaoSelecionada,
      acao,
      observacoes
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      pendente: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pendente', icon: AlertTriangle },
      aprovado: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Aprovado', icon: CheckCircle2 },
      rejeitado: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rejeitado', icon: XCircle },
      faturado: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Faturado', icon: Package }
    };
    const config = configs[status] || configs.pendente;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTituloAcao = () => {
    if (acao === 'aprovar') return 'Aprovar Solicitação';
    if (acao === 'rejeitar') return 'Rejeitar Solicitação';
    if (acao === 'faturar') return 'Confirmar Faturamento';
    return '';
  };

  // Verificar se o usuário tem permissão
  const permissao = user?.permissao_customizada || user?.role;
  if (user && permissao !== 'faturamento' && permissao !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para acessar o Painel de Faturamento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">Painel de Faturamento</h1>
            <p className="text-gray-600">Faturar pedidos enviados pelos vendedores</p>
          </div>
          <ClipboardCheck className="w-16 h-16 text-blue-900 opacity-20" />
        </div>

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

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardTitle className="flex items-center gap-3">
              <ClipboardCheck className="w-6 h-6" />
              Solicitações Pendentes de Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        Carregando solicitações...
                      </TableCell>
                    </TableRow>
                  ) : solicitacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        Nenhuma solicitação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    solicitacoesFiltradas.map((sol) => (
                      <TableRow key={sol.id} className="hover:bg-green-50 transition-colors">
                        <TableCell className="text-sm">
                          {format(new Date(sol.created_date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{sol.numero_pedido}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sol.nome_cliente}</div>
                            <div className="text-xs text-gray-500">Cód: {sol.codigo_cliente}</div>
                          </div>
                        </TableCell>
                        <TableCell>{sol.nome_produto}</TableCell>
                        <TableCell className="text-right font-medium">{sol.volume_solicitado}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          R$ {sol.valor_total?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">{sol.nome_vendedor}</TableCell>
                        <TableCell>{getStatusBadge(sol.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            {sol.status === 'pendente' && (
                              <>
                                <Button
                                  onClick={() => handleAcao(sol, 'aprovar')}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleAcao(sol, 'rejeitar')}
                                  size="sm"
                                  variant="destructive"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {sol.status === 'aprovado' && (
                              <Button
                                onClick={() => handleAcao(sol, 'faturar')}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Package className="w-4 h-4 mr-1" />
                                Faturar
                              </Button>
                            )}
                          </div>
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

      <Dialog open={!!solicitacaoSelecionada} onOpenChange={() => setSolicitacaoSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-blue-900">{getTituloAcao()}</DialogTitle>
          </DialogHeader>
          
          {solicitacaoSelecionada && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Confirma a {acao === 'aprovar' ? 'aprovação' : acao === 'rejeitar' ? 'rejeição' : 'faturamento'} da solicitação do pedido <strong>{solicitacaoSelecionada.numero_pedido}</strong>?
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Cliente:</strong> {solicitacaoSelecionada.nome_cliente}</p>
                <p><strong>Produto:</strong> {solicitacaoSelecionada.nome_produto}</p>
                <p><strong>Volume:</strong> {solicitacaoSelecionada.volume_solicitado}</p>
                <p><strong>Valor:</strong> R$ {solicitacaoSelecionada.valor_total?.toFixed(2)}</p>
              </div>

              {(acao === 'aprovar' || acao === 'rejeitar') && (
                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações (opcional)"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitacaoSelecionada(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAcao}
              disabled={processarMutation.isPending}
              className={acao === 'rejeitar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {processarMutation.isPending ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}