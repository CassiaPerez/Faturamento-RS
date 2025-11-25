import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LogsSincronizacao({ onRessincronizar }) {
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [logSelecionado, setLogSelecionado] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs-sincronizacao'],
    queryFn: () => base44.entities.LogSincronizacao.list('-created_date', 10000)
  });

  const deletarLogMutation = useMutation({
    mutationFn: (logId) => base44.entities.LogSincronizacao.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries(['logs-sincronizacao']);
    }
  });

  const marcarResolvidoMutation = useMutation({
    mutationFn: (logId) => base44.entities.LogSincronizacao.update(logId, { resolvido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['logs-sincronizacao']);
      setLogSelecionado(null);
    }
  });

  const limparLogsAntigos = async () => {
    const logsAntigos = logs.filter(log => {
      const diasAtras = (new Date() - new Date(log.created_date)) / (1000 * 60 * 60 * 24);
      return diasAtras > 30;
    });
    
    for (const log of logsAntigos) {
      await deletarLogMutation.mutateAsync(log.id);
    }
  };

  const logsFiltrados = logs.filter(log => {
    if (filtroTipo === 'todos') return true;
    if (filtroTipo === 'nao-resolvidos') return !log.resolvido && log.tipo === 'erro';
    return log.tipo === filtroTipo;
  });

  const getTipoBadge = (tipo) => {
    const configs = {
      sucesso: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Sucesso' },
      erro: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Erro' },
      aviso: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Aviso' }
    };
    const config = configs[tipo] || configs.aviso;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const errosNaoResolvidos = logs.filter(log => log.tipo === 'erro' && !log.resolvido).length;

  return (
    <div className="space-y-6">
      {errosNaoResolvidos > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> Existem {errosNaoResolvidos} erros não resolvidos na sincronização.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              Logs de Sincronização
            </div>
            <Button
              onClick={limparLogsAntigos}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Logs Antigos (30+ dias)
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-indigo-900">Filtrar por Tipo</h3>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nao-resolvidos">Não Resolvidos</SelectItem>
                <SelectItem value="erro">Erros</SelectItem>
                <SelectItem value="aviso">Avisos</SelectItem>
                <SelectItem value="sucesso">Sucessos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Linha</TableHead>
                  <TableHead>Tentativa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logsFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logsFiltrados.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className={`hover:bg-indigo-50 transition-colors ${!log.resolvido && log.tipo === 'erro' ? 'bg-red-50' : ''}`}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>{getTipoBadge(log.tipo)}</TableCell>
                      <TableCell className="max-w-md truncate">{log.mensagem}</TableCell>
                      <TableCell>{log.linha_arquivo || '-'}</TableCell>
                      <TableCell>{log.tentativa_numero || 1}</TableCell>
                      <TableCell>
                        {log.resolvido ? (
                          <Badge className="bg-green-100 text-green-800">Resolvido</Badge>
                        ) : log.tipo === 'erro' ? (
                          <Badge className="bg-red-100 text-red-800">Pendente</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">-</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => setLogSelecionado(log)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {log.tipo === 'erro' && !log.resolvido && log.dados_pedido && (
                            <Button
                              onClick={() => onRessincronizar && onRessincronizar(log)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <RefreshCw className="w-4 h-4" />
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

      <Dialog open={!!logSelecionado} onOpenChange={() => setLogSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-indigo-900">Detalhes do Log</DialogTitle>
            <DialogDescription>Informações completas sobre o registro</DialogDescription>
          </DialogHeader>
          
          {logSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Data/Hora</p>
                  <p className="font-semibold">{format(new Date(logSelecionado.created_date), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <div className="mt-1">{getTipoBadge(logSelecionado.tipo)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Linha do Arquivo</p>
                  <p className="font-semibold">{logSelecionado.linha_arquivo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tentativa</p>
                  <p className="font-semibold">{logSelecionado.tentativa_numero || 1}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Mensagem</p>
                <p className="font-medium text-blue-900">{logSelecionado.mensagem}</p>
              </div>

              {logSelecionado.detalhes && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Detalhes Técnicos</p>
                  <pre className="text-xs font-mono bg-white p-3 rounded overflow-auto max-h-40">
                    {logSelecionado.detalhes}
                  </pre>
                </div>
              )}

              {logSelecionado.dados_pedido && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Dados do Pedido</p>
                  <pre className="text-xs font-mono bg-white p-3 rounded overflow-auto max-h-60">
                    {JSON.stringify(logSelecionado.dados_pedido, null, 2)}
                  </pre>
                </div>
              )}

              {logSelecionado.tipo === 'erro' && !logSelecionado.resolvido && (
                <div className="flex gap-2 justify-end">
                  {logSelecionado.dados_pedido && onRessincronizar && (
                    <Button
                      onClick={() => {
                        onRessincronizar(logSelecionado);
                        setLogSelecionado(null);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Tentar Re-sincronizar
                    </Button>
                  )}
                  <Button
                    onClick={() => marcarResolvidoMutation.mutate(logSelecionado.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar como Resolvido
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}