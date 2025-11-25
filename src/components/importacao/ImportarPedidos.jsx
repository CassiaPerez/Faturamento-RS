import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNomeVendedor } from "../vendedores/vendedoresMap";

export default function ImportarPedidos({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const processarArquivo = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();
      const linhas = text.split('\n').filter(linha => linha.trim());
      
      const pedidosNovos = [];
      const pedidosAtualizados = [];
      const erros = [];
      const pedidosParaVerificar = new Map();

      // Pular o cabeçalho (primeira linha)
      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        try {
          const campos = linha.split(';');
          
          if (campos.length < 21) {
            continue; // Pula linhas com formato incompleto
          }

          // Mapeamento dos campos do CSV
          // ID;COD_EMPRESA;DT_PREVISAO;NR_PEDIDO;DT_PEDIDO;COD_PESSOA_FILIAL;CLIENTE;CIDADE;UF;CPF_CNPJ;ID_MUNICIPIO;VENDEDOR;COD_VENDEDOR;STATUS_VENDEDOR;COD_ITEM;UNIDADE;DESCRICAO;QUANTIDADE;VALOR_LIQUIDO;VL_UNITARIO
          const codigo_cliente = campos[5]; // COD_PESSOA_FILIAL
          const numero_pedido = campos[3]; // NR_PEDIDO
          const nome_cliente = campos[6]; // CLIENTE
          const nome_vendedor_arquivo = campos[11]; // VENDEDOR
          const codigo_vendedor = campos[12]; // COD_VENDEDOR
          const embalagem = campos[15]; // UNIDADE
          const nome_produto = campos[16]; // DESCRICAO
          const volume = campos[17]; // QUANTIDADE
          const valor_total = campos[18]; // VALOR_LIQUIDO
          const valor_unitario = campos[19]; // VL_UNITARIO

          const volumeNum = parseFloat(volume) || 0;
          const valorUnitarioNum = parseFloat(valor_unitario) || 0;
          const valorTotalNum = parseFloat(valor_total) || 0;

          // Ignorar pedidos com volume total zero ou negativo
          if (volumeNum <= 0) {
            continue;
          }

          // Redirecionar vendedores específicos para Dante Luis Damiani
          let vendedorFinal = codigo_vendedor?.trim() || '745842';
          let nomeVendedorFinal = nome_vendedor_arquivo?.trim() || '';
          
          if (!codigo_vendedor || 
              !nomeVendedorFinal ||
              nomeVendedorFinal.toUpperCase().includes('VENDAS INTERNAS') ||
              nomeVendedorFinal.toUpperCase().includes('BAGUAL AGRO')) {
            vendedorFinal = '745842';
            nomeVendedorFinal = 'Dante Luis Damiani';
          }

          const pedidoData = {
            codigo_cliente: codigo_cliente.trim(),
            numero_pedido: numero_pedido.trim(),
            nome_cliente: nome_cliente.trim(),
            nome_produto: nome_produto.trim(),
            volume_total: volumeNum,
            volume_restante: volumeNum,
            embalagem: embalagem.trim(),
            valor_unitario: valorUnitarioNum,
            valor_total: valorTotalNum,
            codigo_vendedor: vendedorFinal,
            nome_vendedor: nomeVendedorFinal,
            status: "pendente"
          };

          const key = `${pedidoData.numero_pedido}|${pedidoData.codigo_cliente}|${pedidoData.nome_produto}`;
          
          // Evitar duplicatas no arquivo
          if (pedidosParaVerificar.has(key)) {
            continue;
          }
          pedidosParaVerificar.set(key, pedidoData);

          const pedidosExistentes = await base44.entities.Pedido.filter({
            numero_pedido: pedidoData.numero_pedido,
            codigo_cliente: pedidoData.codigo_cliente,
            nome_produto: pedidoData.nome_produto
          });

          // Remover duplicatas antigas se houver
          if (pedidosExistentes.length > 1) {
            const maisRecente = pedidosExistentes.sort((a, b) => 
              new Date(b.created_date) - new Date(a.created_date)
            )[0];
            
            for (let j = 1; j < pedidosExistentes.length; j++) {
              await base44.entities.Pedido.delete(pedidosExistentes[j].id);
            }
            
            await base44.entities.Pedido.update(maisRecente.id, {
              volume_total: pedidoData.volume_total,
              valor_total: pedidoData.valor_total,
              valor_unitario: pedidoData.valor_unitario
            });
            pedidosAtualizados.push(pedidoData.numero_pedido);
          } else if (pedidosExistentes.length === 1) {
            await base44.entities.Pedido.update(pedidosExistentes[0].id, {
              volume_total: pedidoData.volume_total,
              valor_total: pedidoData.valor_total,
              valor_unitario: pedidoData.valor_unitario
            });
            pedidosAtualizados.push(pedidoData.numero_pedido);
          } else {
            await base44.entities.Pedido.create(pedidoData);
            pedidosNovos.push(pedidoData.numero_pedido);
          }
        } catch (error) {
          erros.push(`Linha ${i + 1}: ${error.message}`);
        }
      }

      setResult({
        success: true,
        novos: pedidosNovos.length,
        atualizados: pedidosAtualizados.length,
        erros: erros.length,
        detalhes: erros
      });

      if (onImportComplete) {
        onImportComplete();
      }
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Upload className="w-6 h-6" />
          Importar Carteira de Pedidos
        </CardTitle>
        <CardDescription className="text-blue-100">
          Faça upload do arquivo TXT com os dados da carteira
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-all duration-300">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <Input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileChange}
            className="max-w-md mx-auto"
          />
          {file && (
            <p className="mt-4 text-sm text-gray-600">
              Arquivo selecionado: <span className="font-semibold">{file.name}</span>
            </p>
          )}
        </div>

        <Button
          onClick={processarArquivo}
          disabled={!file || isProcessing}
          className="w-full bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 h-12 text-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Importar Pedidos
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
                  <p className="font-semibold mb-2">Importação concluída com sucesso!</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{result.novos} pedidos novos criados</li>
                    <li>{result.atualizados} pedidos atualizados</li>
                    {result.erros > 0 && <li className="text-orange-600">{result.erros} linhas com erro</li>}
                  </ul>
                  {result.detalhes.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-medium">Ver erros</summary>
                      <ul className="mt-2 text-xs space-y-1">
                        {result.detalhes.map((erro, i) => (
                          <li key={i}>{erro}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <p>{result.message}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">Formato esperado (CSV com ponto e vírgula):</p>
          <code className="text-xs bg-white p-2 rounded block overflow-x-auto">
            ID;COD_EMPRESA;DT_PREVISAO;NR_PEDIDO;DT_PEDIDO;COD_PESSOA_FILIAL;NOME_PESSOA;...;W_ID_VENDEDOR;COD_ITEM;UNIDADE;DESCRICAO;QUANTIDADE;VALOR_LIQUIDO;VL_UNITARIO
          </code>
          <p className="mt-2 text-xs">O arquivo será lido automaticamente com os campos corretos do seu sistema.</p>
        </div>
      </CardContent>
    </Card>
  );
}