import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { converterCodigoVendedor, getNomeVendedor } from "../components/vendedores/vendedoresMap";

export default function ConverterCodigosVendedores() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const converterCodigos = async () => {
    setLoading(true);
    setResultado(null);

    try {
      // Buscar todos os pedidos
      const todosPedidos = await base44.entities.Pedido.list('-created_date', 10000);
      
      let convertidos = 0;
      let atualizados = 0;
      const erros = [];

      // Processar cada pedido
      for (const pedido of todosPedidos) {
        try {
          const codigoAtual = pedido.codigo_vendedor;
          
          // Se não tem código de vendedor, atribuir a Dante Damiani
          if (!codigoAtual) {
            await base44.entities.Pedido.update(pedido.id, {
              codigo_vendedor: '745842',
              nome_vendedor: getNomeVendedor('745842')
            });
            atualizados++;
            continue;
          }
          
          // Converter código se necessário
          const codigoConvertido = converterCodigoVendedor(codigoAtual);
          const nomeAtualizado = getNomeVendedor(codigoConvertido);
          
          // Atualizar se o código foi convertido OU se o nome está incorreto
          if (codigoConvertido !== codigoAtual || pedido.nome_vendedor !== nomeAtualizado) {
            await base44.entities.Pedido.update(pedido.id, {
              codigo_vendedor: codigoConvertido,
              nome_vendedor: nomeAtualizado
            });
            convertidos++;
          }
        } catch (error) {
          erros.push(`Erro no pedido ${pedido.numero_pedido}: ${error.message}`);
        }
      }

      setResultado({
        success: true,
        totalPedidos: todosPedidos.length,
        convertidos,
        atualizados,
        erros
      });
    } catch (error) {
      setResultado({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Converter Códigos de Vendedores</h1>
          <p className="text-gray-600">Substitui ID_Vendedor por Cod_Vendedor em todos os pedidos</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-900 to-purple-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6" />
              Conversão de Códigos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">O que esta ferramenta faz:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Busca todos os pedidos do sistema</li>
                <li>• Atribui vendedor padrão (Dante Damiani) aos pedidos sem vendedor</li>
                <li>• Converte ID_Vendedor para Cod_Vendedor correto</li>
                <li>• Atualiza nome do vendedor baseado no novo código</li>
                <li>• Mostra relatório detalhado da conversão</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={converterCodigos}
                disabled={loading}
                size="lg"
                className="bg-gradient-to-r from-purple-900 to-purple-800 hover:from-purple-800 hover:to-purple-700 h-14 px-8 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Convertendo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Converter Códigos Agora
                  </>
                )}
              </Button>
            </div>

            {resultado && (
              <Alert className={resultado.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                {resultado.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <AlertDescription className={resultado.success ? "text-green-800" : "text-red-800"}>
                  {resultado.success ? (
                    <div>
                      <p className="font-semibold mb-2">✅ Conversão concluída!</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Total de pedidos:</strong> {resultado.totalPedidos}</li>
                        <li><strong>Códigos convertidos:</strong> {resultado.convertidos}</li>
                        <li><strong>Vendedores atribuídos:</strong> {resultado.atualizados}</li>
                        <li><strong>Pedidos sem alteração:</strong> {resultado.totalPedidos - resultado.convertidos - resultado.atualizados}</li>
                        {resultado.erros.length > 0 && (
                          <li className="text-orange-600">
                            <strong>Erros:</strong> {resultado.erros.length}
                          </li>
                        )}
                      </ul>
                      {resultado.erros.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium">Ver erros</summary>
                          <ul className="mt-2 text-xs space-y-1 max-h-60 overflow-y-auto">
                            {resultado.erros.map((erro, i) => (
                              <li key={i}>{erro}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-2">❌ Erro na conversão</p>
                      <p>{resultado.message}</p>
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