import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import SincronizacaoAutomatica from "../components/importacao/SincronizacaoAutomatica";
import LogsSincronizacao from "../components/LogsSincronizacao";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GerenciarPedidos() {
  const [activeTab, setActiveTab] = useState('sincronizar');
  const [logParaRessincronizar, setLogParaRessincronizar] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { refetch } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-created_date', 10000)
  });

  const handleImportComplete = () => {
    refetch();
  };

  const handleRessincronizar = (log) => {
    setLogParaRessincronizar(log);
    setActiveTab('sincronizar');
    setTimeout(() => setLogParaRessincronizar(null), 1000);
  };

  // Verificar se é admin
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Apenas administradores podem acessar este painel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Gerenciar Pedidos</h1>
          <p className="text-gray-600">Sincronize e monitore a importação de pedidos</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="sincronizar" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sincronização
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sincronizar">
            <SincronizacaoAutomatica 
              onSincronizacaoComplete={handleImportComplete} 
              logParaRessincronizar={logParaRessincronizar}
            />
          </TabsContent>

          <TabsContent value="logs">
            <LogsSincronizacao onRessincronizar={handleRessincronizar} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}