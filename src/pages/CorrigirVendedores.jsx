import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { getNomeVendedor } from "../components/vendedores/vendedoresMap";

export default function CorrigirVendedores() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const corrigirVendedores = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      // Buscar todos os pedidos
      const todosPedidos = await base44.entities.Pedido.list('-created_date', 10000);
      
      let corrigidos = 0;
      let erros = 0;
      const detalhes = [];

      console.log(`📊 Total de pedidos a verificar: ${todosPedidos.length}`);

      // Processar cada pedido
      for (const pedido of todosPedidos) {
        try {
          const codigoAtual = pedido.codigo_vendedor || '745842';
          const nomeCorreto = getNomeVendedor(codigoAtual) || 'Dante Damiani';
          
          // Só atualizar se o nome estiver diferente
          if (pedido.nome_vendedor !== nomeCorreto) {
            await base44.entities.Pedido.update(pedido.id, {
              codigo_vendedor: codigoAtual,
              nome_vendedor: nomeCorreto
            });
            
            detalhes.push(`Pedido ${pedido.numero_pedido}: ${pedido.nome_vendedor} → ${nomeCorreto}`);
            corrigidos++;
            
            if (corrigidos % 50 === 0) {
              console.log(`✅ Corrigidos: ${corrigidos}/${todosPedidos.length}`);
            }
          }
        } catch (error) {
          erros++;
          console.error(`❌ Erro no pedido ${pedido.numero_pedido}:`, error.message);
        }
      }

      setResult({
        success: true,
        total: todosPedidos.length,
        corrigidos,
        erros,
        detalhes
      });

    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-900 to-orange-800 text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <RefreshCw className="w-6 h-6" />
              Corrigir Vendedores dos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>O que esta ferramenta faz:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Busca todos os pedidos no sistema</li>
                  <li>Verifica o código do vendedor de cada pedido</li>
                  <li>Aplica o mapeamento correto para o nome do vendedor</li>
                  <li>Atualiza os pedidos com os nomes corretos</li>
                  <li>Pedidos sem vendedor são atribuídos a Dante Damiani</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={corrigirVendedores}
              disabled={isProcessing}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-900 to-orange-800 hover:from-orange-800 hover:to-orange-700 h-14 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Corrigindo vendedores...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Corrigir Vendedores Agora
                </>
              )}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.success ? (
                    <div>
                      <p className="font-semibold mb-2">✅ Correção concluída!</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Total de pedidos verificados:</strong> {result.total}</li>
                        <li><strong>Pedidos corrigidos:</strong> {result.corrigidos}</li>
                        <li><strong>Erros:</strong> {result.erros}</li>
                      </ul>
                      {result.detalhes.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium">
                            Ver detalhes das correções ({result.detalhes.length})
                          </summary>
                          <ul className="mt-2 text-xs space-y-1 max-h-60 overflow-y-auto">
                            {result.detalhes.map((detalhe, i) => (
                              <li key={i}>{detalhe}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-2">❌ Erro na correção</p>
                      <p>{result.message}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}