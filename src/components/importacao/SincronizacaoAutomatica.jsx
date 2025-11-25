import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Clock, Download, Upload, Bell, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNomeVendedor, converterCodigoVendedor } from "../vendedores/vendedoresMap";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

const INTERVALO_SINCRONIZACAO = 4 * 60 * 60 * 1000; // 4 horas em milissegundos

export default function SincronizacaoAutomatica({ onSincronizacaoComplete, logParaRessincronizar }) {
  const [isSincronizando, setIsSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState(null);
  const [proximaSincronizacao, setProximaSincronizacao] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [tempoRestante, setTempoRestante] = useState('');
  const [notificacaoEmail, setNotificacaoEmail] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [testingUrl, setTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Carregar ID do arquivo do localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('googleDriveFileId');
    if (savedId) {
      setDriveFileId(savedId);
    } else {
      // ID padrão inicial
      const defaultId = "1ifetFw_-dbBGrUQrupy9luJqxuD6sMVy";
      setDriveFileId(defaultId);
      localStorage.setItem('googleDriveFileId', defaultId);
    }
  }, []);

  // Função para gerar URLs a partir do ID
  const getGoogleDriveUrls = (fileId) => {
    return {
      fileUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      viewLink: `https://drive.google.com/file/d/${fileId}/view`
    };
  };

  // Função para testar URL
  const testarUrl = async () => {
    if (!driveFileId.trim()) {
      setTestResult({ success: false, message: 'Por favor, insira um ID de arquivo válido' });
      return;
    }

    setTestingUrl(true);
    setTestResult(null);

    try {
      const { fileUrl } = getGoogleDriveUrls(driveFileId.trim());
      
      const urlsTentativas = [
        fileUrl,
        `https://drive.google.com/uc?export=download&id=${driveFileId.trim()}&confirm=t`,
        `https://drive.usercontent.google.com/u/0/uc?id=${driveFileId.trim()}&export=download`,
        `https://docs.google.com/uc?export=download&id=${driveFileId.trim()}`,
        `https://corsproxy.io/?${encodeURIComponent(fileUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fileUrl)}`
      ];

      let downloadSucesso = false;

      for (const url of urlsTentativas) {
        try {
          // Tentar sem headers primeiro
          let response = await fetch(url);
          
          // Se falhar, tentar com headers
          if (!response.ok) {
            response = await fetch(url, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit'
            });
          }

          if (response.ok) {
            const texto = await response.text();
            
            if (texto && 
                texto.length > 100 && 
                !texto.includes('<!DOCTYPE') && 
                !texto.includes('<html>') &&
                !texto.includes('<HTML>') &&
                texto.includes(';')) {
              
              downloadSucesso = true;
              setTestResult({ 
                success: true, 
                message: `✅ URL válida! Arquivo acessível (${texto.length} caracteres)`,
                url: url
              });
              
              // Salvar no localStorage
              localStorage.setItem('googleDriveFileId', driveFileId.trim());
              break;
            }
          }
        } catch (e) {
          // Continua tentando as outras URLs
        }
        
        // Delay entre tentativas
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!downloadSucesso) {
        setTestResult({ 
          success: false, 
          message: '❌ Não foi possível acessar o arquivo. Verifique se o ID está correto e se o arquivo tem permissão pública.' 
        });
      }
    } catch (error) {
      setTestResult({ success: false, message: `❌ Erro ao testar: ${error.message}` });
    } finally {
      setTestingUrl(false);
    }
  };

  useEffect(() => {
    // Carregar última sincronização do localStorage
    const ultima = localStorage.getItem('ultimaSincronizacao');
    if (ultima) {
      const dataUltima = new Date(ultima);
      setUltimaSincronizacao(dataUltima);
      setProximaSincronizacao(new Date(dataUltima.getTime() + INTERVALO_SINCRONIZACAO));
    } else {
      // Se nunca sincronizou, fazer a primeira sincronização automaticamente
      console.log('🚀 Primeira sincronização automática será iniciada em 5 segundos...');
      setTimeout(() => {
        sincronizar();
      }, 5000); // Aguarda 5 segundos após carregar a página
    }

    // Configurar intervalo de verificação a cada minuto
    const intervalo = setInterval(() => {
      verificarESincronizar();
      atualizarTempoRestante();
    }, 60000); // Verifica a cada 1 minuto

    // Atualizar tempo restante a cada segundo
    const intervaloTempo = setInterval(() => {
      atualizarTempoRestante();
    }, 1000);

    return () => {
      clearInterval(intervalo);
      clearInterval(intervaloTempo);
    };
  }, []);

  const verificarESincronizar = async () => {
    if (isSincronizando) return;
    
    const ultima = localStorage.getItem('ultimaSincronizacao');
    if (!ultima) {
      // Se não tem sincronização anterior, sincronizar agora
      console.log('🔄 Nenhuma sincronização prévia - iniciando sincronização automática...');
      await sincronizar();
      return;
    }

    const dataUltima = new Date(ultima);
    const agora = new Date();
    const diferencaHoras = (agora - dataUltima) / (1000 * 60 * 60);

    if (diferencaHoras >= 4) {
      console.log('⏰ Passaram 4 horas - iniciando sincronização automática...');
      await sincronizar();
    }
  };

  const atualizarTempoRestante = () => {
    if (!proximaSincronizacao) return;

    const agora = new Date();
    const diferenca = proximaSincronizacao - agora;

    if (diferenca <= 0) {
      setTempoRestante('Sincronizando...');
      return;
    }

    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

    setTempoRestante(`${horas}h ${minutos}m ${segundos}s`);
  };

  const ressincronizarPedido = async (log) => {
    if (!log.dados_pedido) return;

    setIsSincronizando(true);
    setResultado(null);

    try {
      const pedidoData = log.dados_pedido;
      const tentativaNumero = (log.tentativa_numero || 1) + 1;

      // Verificar se o pedido já existe
      const pedidosExistentes = await base44.entities.Pedido.filter({
        numero_pedido: pedidoData.numero_pedido,
        codigo_cliente: pedidoData.codigo_cliente,
        nome_produto: pedidoData.nome_produto
      });

      if (pedidosExistentes.length > 0) {
        // Atualizar pedido existente
        await base44.entities.Pedido.update(pedidosExistentes[0].id, {
          volume_total: pedidoData.volume_total,
          valor_total: pedidoData.valor_total,
          valor_unitario: pedidoData.valor_unitario
        });
      } else {
        // Criar novo pedido
        await base44.entities.Pedido.create(pedidoData);
      }

      // Marcar log como resolvido
      await base44.entities.LogSincronizacao.update(log.id, { resolvido: true });

      // Registrar sucesso
      await base44.entities.LogSincronizacao.create({
        tipo: 'sucesso',
        mensagem: `Pedido ${pedidoData.numero_pedido} re-sincronizado com sucesso`,
        dados_pedido: pedidoData,
        linha_arquivo: log.linha_arquivo,
        tentativa_numero: tentativaNumero
      });

      setResultado({
        success: true,
        novos: pedidosExistentes.length === 0 ? 1 : 0,
        atualizados: pedidosExistentes.length > 0 ? 1 : 0,
        erros: 0,
        totalLinhas: 1,
        detalhes: []
      });

      if (onSincronizacaoComplete) {
        onSincronizacaoComplete();
      }
    } catch (error) {
      // Registrar falha na re-sincronização
      await base44.entities.LogSincronizacao.create({
        tipo: 'erro',
        mensagem: `Falha na re-sincronização do pedido ${log.dados_pedido?.numero_pedido}`,
        detalhes: error.message,
        dados_pedido: log.dados_pedido,
        linha_arquivo: log.linha_arquivo,
        tentativa_numero: (log.tentativa_numero || 1) + 1
      });

      setResultado({
        success: false,
        message: `Erro na re-sincronização: ${error.message}`
      });
    } finally {
      setIsSincronizando(false);
    }
  };

  // Verificar se existe um log para re-sincronizar
  useEffect(() => {
    if (logParaRessincronizar) {
      ressincronizarPedido(logParaRessincronizar);
    }
  }, [logParaRessincronizar]);

  const enviarNotificacaoErro = async (erros) => {
    try {
      const emailDestino = notificacaoEmail || user?.email;
      if (!emailDestino) return;

      const corpoEmail = `
        <h2>Erro na Sincronização de Pedidos</h2>
        <p>A sincronização automática encontrou ${erros.length} erros:</p>
        <ul>
          ${erros.slice(0, 10).map(erro => `<li>${erro}</li>`).join('')}
          ${erros.length > 10 ? `<li><em>... e mais ${erros.length - 10} erros</em></li>` : ''}
        </ul>
        <p>Acesse o sistema para ver os detalhes completos e tentar re-sincronizar os pedidos que falharam.</p>
        <p><em>Data/Hora: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</em></p>
      `;

      await base44.integrations.Core.SendEmail({
        to: emailDestino,
        subject: `⚠️ Falha na Sincronização de Pedidos - ${erros.length} erros`,
        body: corpoEmail
      });

      console.log('📧 Email de notificação enviado para:', emailDestino);
    } catch (error) {
      console.error('❌ Erro ao enviar email de notificação:', error);
    }
  };

  const sincronizar = async () => {
    if (isSincronizando) return;

    setIsSincronizando(true);
    setResultado(null);

    try {
      const currentFileId = localStorage.getItem('googleDriveFileId') || driveFileId;
      const { fileUrl } = getGoogleDriveUrls(currentFileId);
      
      console.log('🔄 Iniciando sincronização automática com Google Drive...');
      console.log('📋 ID do arquivo:', currentFileId);
      console.log('📋 Link do arquivo:', fileUrl);
      
      // Passo 1: Baixar arquivo diretamente do Google Drive
      let conteudo = null;
      let arquivoSalvoUrl = null;

      console.log('📥 Iniciando download do Google Drive...');

      // Tentar múltiplos métodos de download (sem LLM)
      // Incluindo proxies CORS para contornar bloqueios
      const urlsTentativas = [
        fileUrl,
        `https://drive.google.com/uc?export=download&id=${currentFileId}&confirm=t`,
        `https://drive.usercontent.google.com/u/0/uc?id=${currentFileId}&export=download`,
        `https://docs.google.com/uc?export=download&id=${currentFileId}`,
        `https://corsproxy.io/?${encodeURIComponent(fileUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fileUrl)}`
      ];

      let downloadSucesso = false;
      let ultimoErro = null;

      for (const url of urlsTentativas) {
        try {
          console.log(`📥 Tentando download de: ${url}`);
          
          // Tentar sem headers customizados primeiro (mais simples)
          let response = await fetch(url);
          
          // Se falhar, tentar com headers
          if (!response.ok) {
            response = await fetch(url, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
              headers: {
                'Accept': 'text/plain, text/csv, application/octet-stream, */*'
              }
            });
          }

          if (response.ok) {
            const texto = await response.text();

            console.log(`📊 Resposta recebida: ${texto.length} caracteres`);
            console.log(`📊 Primeiros 200 caracteres:`, texto.substring(0, 200));

            // Verificar se é realmente o conteúdo do arquivo (não uma página HTML de erro)
            if (texto && 
                texto.length > 100 && 
                !texto.includes('<!DOCTYPE') && 
                !texto.includes('<html>') &&
                !texto.includes('<HTML>') &&
                texto.includes(';')) {

              conteudo = texto;
              console.log('✅ Download bem-sucedido!', conteudo.length, 'caracteres');
              console.log('✅ Primeiras 3 linhas:', conteudo.split('\n').slice(0, 3).join('\n'));
              downloadSucesso = true;
              break;
            } else {
              console.log(`⚠️ Conteúdo inválido - parece ser HTML ou muito pequeno`);
            }
          } else {
            console.log(`⚠️ Resposta não OK: ${response.status} ${response.statusText}`);
          }
        } catch (e) {
          console.log(`⚠️ Falha com URL ${url}:`, e.message);
          ultimoErro = e.message;
        }
        
        // Pequeno delay entre tentativas
        if (!downloadSucesso) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!downloadSucesso) {
        // Registrar erro
        await base44.entities.LogSincronizacao.create({
          tipo: 'erro',
          mensagem: 'Falha ao baixar arquivo do Google Drive (todas as URLs tentadas)',
          detalhes: `Último erro: ${ultimoErro}`
        });

        throw new Error(`Não foi possível baixar o arquivo do Google Drive.

      ⚠️ VERIFIQUE:
      1. O arquivo está com permissão "Qualquer pessoa com o link pode ver"
      2. Abra este link em aba anônima e veja se consegue baixar: ${fileUrl}
      3. Se não funcionar, use a aba "Importação Manual" para fazer upload do arquivo

      🔧 Detalhes técnicos:
      - Todas as ${urlsTentativas.length} URLs de download foram testadas
      - Último erro: ${ultimoErro}`);
      }

      // Salvar arquivo no projeto para backup
      try {
        const blob = new Blob([conteudo], { type: 'text/plain' });
        const file = new File([blob], 'carteira_pedidos_sincronizada.txt', { type: 'text/plain' });
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        arquivoSalvoUrl = uploadResult.file_url;
        console.log('✅ Arquivo salvo em:', arquivoSalvoUrl);
      } catch (error) {
        console.log('⚠️ Erro ao salvar arquivo:', error.message);
      }
      
      // Passo 4: Análise do arquivo
      console.log('\n🔍 ANÁLISE DO ARQUIVO:');
      console.log('   Tamanho total:', conteudo.length, 'caracteres');
      console.log('   Tipo de quebra de linha:', conteudo.includes('\r\n') ? 'Windows (\\r\\n)' : conteudo.includes('\n') ? 'Unix (\\n)' : 'Mac (\\r)');
      console.log('   Contém HTML?', conteudo.includes('<html') || conteudo.includes('<!DOCTYPE'));
      console.log('   Contém cabeçalho CSV?', conteudo.split('\n')[0]?.includes(';'));
      
      const primeiraLinha = conteudo.split('\n')[0];
      const campos = primeiraLinha?.split(';');
      console.log('   Campos no cabeçalho:', campos?.length);
      console.log('   Primeiros 5 campos:', campos?.slice(0, 5));
      
      const segundaLinha = conteudo.split('\n')[1];
      const camposSegunda = segundaLinha?.split(';');
      console.log('   Campos na linha 2:', camposSegunda?.length);
      console.log('   Dados linha 2:', camposSegunda?.slice(0, 5));
      
      console.log('📄 Primeiras 500 caracteres:', conteudo.substring(0, 500));
      console.log('📄 Últimos 200 caracteres:', conteudo.substring(conteudo.length - 200));
      console.log('');

      // Processar o conteúdo (formato CSV com ; como delimitador)
      const linhas = conteudo.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
      const erros = [];
      const pedidosParaCriar = [];
      const pedidosParaProcessar = [];

      console.log(`📊 Total de linhas no arquivo (sem vazias): ${linhas.length}`);
      console.log(`📊 Cabeçalho:`, linhas[0]?.substring(0, 200));
      console.log(`📊 Primeira linha de dados:`, linhas[1]?.substring(0, 200));
      console.log(`📊 Última linha:`, linhas[linhas.length - 1]?.substring(0, 200));

      // Etapa 1: Parsear todas as linhas (começar do índice 1 para pular cabeçalho)
      // Formato do arquivo (separado por ;):
      // [0]ID;[1]COD_EMPRESA;[2]DT_PREVISAO;[3]NR_PEDIDO;[4]DT_PEDIDO;[5]COD_PESSOA_FILIAL;
      // [6]NOME_PESSOA;[7]CIDADE_PESSOA;[8]UF_PESSOA;[9]CPF_CNPJ;[10]ID_Municipio;
      // [11]W_ID_VENDEDOR;[12]COD_ITEM;[13]UNIDADE;[14]DESCRICAO;[15]QUANTIDADE;
      // [16]VALOR_LIQUIDO;[17]VL_UNITARIO;...
      
      let linhasProcessadas = 0;
      let linhasIgnoradas = 0;
      const motivosIgnorados = {};
      
      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        
        try {
          const campos = linha.split(';');
          
          // Log detalhado das primeiras 5 linhas para debug
          if (i <= 5) {
            console.log(`\n📋 Linha ${i + 1} (${campos.length} campos):`);
            console.log(`   [3] NR_PEDIDO: "${campos[3]?.trim()}"`);
            console.log(`   [5] COD_CLIENTE: "${campos[5]?.trim()}"`);
            console.log(`   [6] NOME_CLIENTE: "${campos[6]?.trim()}"`);
            console.log(`   [11] VENDEDOR: "${campos[11]?.trim()}"`);
            console.log(`   [14] PRODUTO: "${campos[14]?.trim()}"`);
            console.log(`   [15] VOLUME: "${campos[15]?.trim()}"`);
            console.log(`   [16] VL_LIQUIDO: "${campos[16]?.trim()}"`);
            console.log(`   [17] VL_UNITARIO: "${campos[17]?.trim()}"`);
          }
          
          // Extrair dados do formato correto
          // ID;COD_EMPRESA;DT_PREVISAO;NR_PEDIDO;DT_PEDIDO;COD_PESSOA_FILIAL;CLIENTE;CIDADE_CLIENTE;UF_CLIENTE;CPF_CNPJ;ID_MUNICIPIO;VENDEDOR;COD_VENDEDOR;STATUS_VENDEDOR;COD_ITEM;UNIDADE;DESCRICAO;QUANTIDADE;VALOR_LIQUIDO;VL_UNITARIO
          // [0]ID;[1]COD_EMPRESA;[2]DT_PREVISAO;[3]NR_PEDIDO;[4]DT_PEDIDO;[5]COD_PESSOA_FILIAL;[6]CLIENTE;[7]CIDADE;[8]UF;[9]CPF_CNPJ;[10]ID_MUNICIPIO;[11]VENDEDOR;[12]COD_VENDEDOR;[13]STATUS_VENDEDOR;[14]COD_ITEM;[15]UNIDADE;[16]DESCRICAO;[17]QUANTIDADE;[18]VALOR_LIQUIDO;[19]VL_UNITARIO
          const data_pedido = campos[4]?.trim() || ''; // DT_PEDIDO
          const numero_pedido = campos[3]?.trim() || '';
          const codigo_cliente = campos[5]?.trim() || '';
          const nome_cliente = campos[6]?.trim() || '';
          const nome_vendedor_arquivo = campos[11]?.trim() || ''; // VENDEDOR
          const codigo_vendedor = campos[12]?.trim() || ''; // COD_VENDEDOR
          const embalagem = campos[15]?.trim() || ''; // UNIDADE
          const nome_produto = campos[16]?.trim() || ''; // DESCRICAO
          const volume = campos[17]?.trim() || '0'; // QUANTIDADE
          const valor_total = campos[18]?.trim() || '0'; // VALOR_LIQUIDO
          const valor_unitario = campos[19]?.trim() || '0'; // VL_UNITARIO

          // Validação: precisa ter pelo menos número do pedido
          if (!numero_pedido) {
            linhasIgnoradas++;
            const motivo = 'Sem número de pedido';
            motivosIgnorados[motivo] = (motivosIgnorados[motivo] || 0) + 1;
            if (linhasIgnoradas <= 3) {
              console.log(`⚠️ Linha ${i + 1} ignorada: ${motivo} (campos: ${campos.length})`);
            }
            continue;
          }

          // Converter valores numéricos
          const volumeNum = parseFloat(volume.replace(',', '.')) || 0;
          const valorUnitarioNum = parseFloat(valor_unitario.replace(',', '.')) || 0;
          const valorTotalNum = parseFloat(valor_total.replace(',', '.')) || 0;

          // Ignorar pedidos com volume total zero ou negativo
          if (volumeNum <= 0) {
            linhasIgnoradas++;
            const motivo = 'Volume total zero ou negativo';
            motivosIgnorados[motivo] = (motivosIgnorados[motivo] || 0) + 1;
            continue;
          }

          // Criar objeto do pedido com valores padrão quando ausentes
          // Redirecionar vendedores específicos para Dante Luis Damiani
          let vendedorFinal = codigo_vendedor || '745842';
          let nomeVendedorFinal = nome_vendedor_arquivo || '';
          
          if (!codigo_vendedor || 
              !nome_vendedor_arquivo || 
              nome_vendedor_arquivo.toUpperCase().includes('VENDAS INTERNAS') ||
              nome_vendedor_arquivo.toUpperCase().includes('BAGUAL AGRO')) {
            vendedorFinal = '745842';
            nomeVendedorFinal = 'Dante Luis Damiani';
          }

          pedidosParaProcessar.push({
            data_pedido: data_pedido || new Date().toISOString().split('T')[0],
            codigo_cliente: codigo_cliente || 'SEM_CODIGO',
            numero_pedido,
            nome_cliente: nome_cliente || 'Cliente não informado',
            nome_produto: nome_produto || 'Produto não informado',
            volume_total: volumeNum,
            volume_restante: volumeNum,
            embalagem: embalagem || 'UN',
            valor_unitario: valorUnitarioNum,
            valor_total: valorTotalNum,
            codigo_vendedor: vendedorFinal,
            nome_vendedor: nomeVendedorFinal,
            status: "pendente"
          });
          
          linhasProcessadas++;
          
          // Log de progresso
          if (linhasProcessadas <= 5 || linhasProcessadas % 500 === 0) {
            console.log(`✅ Linha ${i + 1} processada (total: ${linhasProcessadas})`);
          }
        } catch (error) {
          console.error(`❌ Erro na linha ${i + 1}:`, error.message);
          erros.push(`Linha ${i + 1}: ${error.message}`);
          
          // Não para o processo, continua para a próxima linha
          linhasIgnoradas++;
          const motivo = `Erro: ${error.message}`;
          motivosIgnorados[motivo] = (motivosIgnorados[motivo] || 0) + 1;
        }
      }

      console.log(`\n📊 RESUMO COMPLETO DO PARSING:`);
      console.log(`   📄 Total de linhas no arquivo: ${linhas.length}`);
      console.log(`   ✅ Pedidos parseados com sucesso: ${pedidosParaProcessar.length}`);
      console.log(`   ⚠️ Linhas ignoradas: ${linhasIgnoradas}`);
      console.log(`   ❌ Erros: ${erros.length}`);
      console.log(`\n📋 Motivos de linhas ignoradas:`);
      Object.entries(motivosIgnorados).forEach(([motivo, count]) => {
        console.log(`   - ${motivo}: ${count} linhas`);
      });
      console.log(`\n📦 Exemplo do primeiro pedido:`, pedidosParaProcessar[0]);
      console.log(`📦 Exemplo do último pedido:`, pedidosParaProcessar[pedidosParaProcessar.length - 1]);

      // Etapa 2: Buscar snapshot anterior para sincronização incremental
      const snapshots = await base44.entities.SnapshotSincronizacao.list('-created_date', 1);
      const ultimoSnapshot = snapshots[0];
      const hashAnterior = ultimoSnapshot?.hash_pedidos || {};
      
      console.log(`📸 Snapshot anterior: ${ultimoSnapshot ? Object.keys(hashAnterior).length + ' pedidos' : 'Nenhum'}`);

      // Etapa 3: Identificar pedidos a processar
      // Se não houver snapshot, processar todos (primeira sincronização)
      let pedidosNovosOuAlterados;
      
      if (!ultimoSnapshot || Object.keys(hashAnterior).length === 0) {
        console.log('🆕 Primeira sincronização - processando todos os pedidos');
        pedidosNovosOuAlterados = pedidosParaProcessar;
      } else {
        // Sincronização incremental: apenas novos ou alterados
        pedidosNovosOuAlterados = pedidosParaProcessar.filter(pedido => {
          const key = `${pedido.numero_pedido}|${pedido.codigo_cliente}|${pedido.nome_produto}`;
          const anterior = hashAnterior[key];
          
          // Novo pedido ou valores alterados
          if (!anterior) return true;
          
          return anterior.volume !== pedido.volume_total || 
                 anterior.valor !== pedido.valor_total;
        });
      }

      console.log(`🔄 ${ultimoSnapshot ? 'Sincronização incremental' : 'Sincronização completa'}: ${pedidosNovosOuAlterados.length} de ${pedidosParaProcessar.length} pedidos precisam ser processados`);

      // Etapa 4: Buscar pedidos existentes e solicitações pendentes
      const todosPedidos = await base44.entities.Pedido.list('-created_date', 10000);
      const solicitacoesPendentes = await base44.entities.SolicitacaoFaturamento.filter({ status: 'pendente' });
      
      const pedidosExistentesMap = new Map();
      const solicitacoesPendentesSet = new Set();
      const pedidosDuplicados = [];
      
      // Remover duplicatas primeiro
      const pedidosUnicos = new Map();
      todosPedidos.forEach(p => {
        const key = `${p.numero_pedido}|${p.codigo_cliente}|${p.nome_produto}`;
        if (pedidosUnicos.has(key)) {
          // Duplicata encontrada - manter o mais recente e marcar os antigos para exclusão
          const existente = pedidosUnicos.get(key);
          if (new Date(p.created_date) > new Date(existente.created_date)) {
            pedidosDuplicados.push(existente.id);
            pedidosUnicos.set(key, p);
          } else {
            pedidosDuplicados.push(p.id);
          }
        } else {
          pedidosUnicos.set(key, p);
        }
      });
      
      // Excluir duplicatas
      if (pedidosDuplicados.length > 0) {
        console.log(`🗑️ Excluindo ${pedidosDuplicados.length} pedidos duplicados...`);
        await Promise.all(pedidosDuplicados.map(id => 
          base44.entities.Pedido.delete(id).catch(err => 
            console.error(`Erro ao excluir pedido ${id}:`, err)
          )
        ));
      }
      
      // Usar apenas os pedidos únicos
      pedidosUnicos.forEach(p => {
        const key = `${p.numero_pedido}|${p.codigo_cliente}|${p.nome_produto}`;
        pedidosExistentesMap.set(key, p);
      });
      
      solicitacoesPendentes.forEach(s => {
        const key = `${s.numero_pedido}|${s.codigo_cliente}|${s.nome_produto}`;
        solicitacoesPendentesSet.add(key);
      });

      console.log(`🔍 Pedidos no banco: ${todosPedidos.length}`);
      console.log(`⏳ Solicitações pendentes: ${solicitacoesPendentes.length}`);

      // Etapa 5: Separar novos e atualizações (ignorar pedidos com solicitação pendente)
      const pedidosParaAtualizar = [];
      const pedidosNovos = [];
      const pedidosAtualizados = [];
      const pedidosIgnorados = [];

      pedidosNovosOuAlterados.forEach(pedido => {
        const key = `${pedido.numero_pedido}|${pedido.codigo_cliente}|${pedido.nome_produto}`;
        const existente = pedidosExistentesMap.get(key);
        
        // Ignorar se já tem solicitação pendente
        if (solicitacoesPendentesSet.has(key)) {
          pedidosIgnorados.push(pedido.numero_pedido);
          return;
        }
        
        if (existente) {
          // Só atualizar se houver mudança real nos valores
          if (existente.volume_total !== pedido.volume_total || 
              existente.valor_total !== pedido.valor_total) {
            pedidosParaAtualizar.push({
              id: existente.id,
              dados: {
                volume_total: pedido.volume_total,
                volume_restante: pedido.volume_total - (existente.volume_total - existente.volume_restante),
                valor_total: pedido.valor_total,
                valor_unitario: pedido.valor_unitario
              }
            });
          }
        } else {
          pedidosParaCriar.push(pedido);
        }
      });

      console.log(`✨ Novos: ${pedidosParaCriar.length}, Atualizar: ${pedidosParaAtualizar.length}, Ignorados: ${pedidosIgnorados.length}`);

      // Etapa 6: Criar e atualizar em paralelo
      const promises = [];

      if (pedidosParaCriar.length > 0) {
        promises.push(
          base44.entities.Pedido.bulkCreate(pedidosParaCriar).then(() => {
            pedidosNovos.push(...pedidosParaCriar.map(p => p.numero_pedido));
          }).catch(async (error) => {
            console.error('❌ Erro ao criar pedidos:', error);
            await base44.entities.LogSincronizacao.create({
              tipo: 'erro',
              mensagem: 'Erro ao criar pedidos em lote',
              detalhes: error.message,
              dados_pedido: { quantidade: pedidosParaCriar.length }
            });
          })
        );
      }

      if (pedidosParaAtualizar.length > 0) {
        const updatePromises = pedidosParaAtualizar.map(p => 
          base44.entities.Pedido.update(p.id, p.dados).then(() => {
            pedidosAtualizados.push(p.id);
          }).catch(async (error) => {
            console.error('❌ Erro ao atualizar pedido:', p.id, error);
            await base44.entities.LogSincronizacao.create({
              tipo: 'erro',
              mensagem: `Erro ao atualizar pedido ${p.id}`,
              detalhes: error.message,
              dados_pedido: p.dados
            });
          })
        );
        promises.push(Promise.all(updatePromises));
      }

      await Promise.all(promises);
      
      // Etapa 7: Salvar novo snapshot para próxima sincronização incremental
      const novoHash = {};
      pedidosParaProcessar.forEach(p => {
        const key = `${p.numero_pedido}|${p.codigo_cliente}|${p.nome_produto}`;
        novoHash[key] = { volume: p.volume_total, valor: p.valor_total };
      });
      
      await base44.entities.SnapshotSincronizacao.create({
        arquivo_url: arquivoSalvoUrl,
        total_pedidos: pedidosParaProcessar.length,
        hash_pedidos: novoHash,
        data_sincronizacao: new Date().toISOString()
      });
      
      console.log(`📸 Novo snapshot salvo: ${pedidosParaProcessar.length} pedidos`);

      console.log(`✅ Processamento completo:`, {
        totalLinhas: linhas.length - 1,
        pedidosParseados: pedidosParaProcessar.length,
        novos: pedidosNovos.length,
        atualizados: pedidosAtualizados.length,
        erros: erros.length
      });

      const agora = new Date();
      localStorage.setItem('ultimaSincronizacao', agora.toISOString());
      setUltimaSincronizacao(agora);
      setProximaSincronizacao(new Date(agora.getTime() + INTERVALO_SINCRONIZACAO));

      // Registrar log de sucesso
      await base44.entities.LogSincronizacao.create({
        tipo: 'sucesso',
        mensagem: `Sincronização incremental concluída: ${pedidosNovos.length} novos, ${pedidosAtualizados.length} atualizados, ${pedidosIgnorados.length} ignorados`,
        detalhes: JSON.stringify({
          totalLinhas: linhas.length - 1,
          pedidosParseados: pedidosParaProcessar.length,
          pedidosProcessados: pedidosNovosOuAlterados.length,
          novos: pedidosNovos.length,
          atualizados: pedidosAtualizados.length,
          ignorados: pedidosIgnorados.length,
          erros: erros.length
        })
      });

      // Enviar notificação se houver erros
      if (erros.length > 0) {
        await enviarNotificacaoErro(erros);
      }

      setResultado({
        success: true,
        novos: pedidosNovos.length,
        atualizados: pedidosAtualizados.length,
        ignorados: pedidosIgnorados.length,
        processados: pedidosNovosOuAlterados.length,
        erros: erros.length,
        totalLinhas: linhas.length - 1,
        detalhes: erros
      });

      if (onSincronizacaoComplete) {
        onSincronizacaoComplete();
      }
    } catch (error) {
      // Registrar erro crítico
      await base44.entities.LogSincronizacao.create({
        tipo: 'erro',
        mensagem: 'Falha crítica na sincronização',
        detalhes: error.stack || error.message
      });

      // Enviar notificação de erro crítico
      await enviarNotificacaoErro([`Erro crítico: ${error.message}`]);

      setResultado({
        success: false,
        message: error.message
      });
    } finally {
      setIsSincronizando(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-900 to-purple-800 text-white">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <RefreshCw className={`w-6 h-6 ${isSincronizando ? 'animate-spin' : ''}`} />
          Sincronização Automática
        </CardTitle>
        <CardDescription className="text-purple-100">
          Importação automática do Google Drive a cada 4 horas
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-700" />
                <h3 className="font-semibold text-blue-900">Última Sincronização</h3>
              </div>
              {ultimaSincronizacao ? (
                <p className="text-2xl font-bold text-blue-900">
                  {format(ultimaSincronizacao, 'dd/MM/yyyy HH:mm')}
                </p>
              ) : (
                <p className="text-gray-500">Nenhuma sincronização ainda</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className="w-5 h-5 text-green-700" />
                <h3 className="font-semibold text-green-900">Próxima Sincronização</h3>
              </div>
              {proximaSincronizacao ? (
                <div>
                  <p className="text-sm text-green-700 mb-1">
                    {format(proximaSincronizacao, 'dd/MM/yyyy HH:mm')}
                  </p>
                  <Badge className="bg-green-600 text-white">
                    {tempoRestante || 'Calculando...'}
                  </Badge>
                </div>
              ) : (
                <p className="text-gray-500">Aguardando primeira sincronização</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-indigo-300 bg-indigo-50">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Configuração do Google Drive
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-indigo-900 mb-2 block">
                    ID do Arquivo do Google Drive
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Cole o ID do arquivo aqui"
                      value={driveFileId}
                      onChange={(e) => {
                        setDriveFileId(e.target.value);
                        setTestResult(null);
                      }}
                      className="bg-white flex-1"
                    />
                    <Button
                      onClick={testarUrl}
                      disabled={testingUrl || !driveFileId.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {testingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Testar URL
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-indigo-700 mt-1">
                    Cole apenas o ID do arquivo (ex: 1ifetFw_-dbBGrUQrupy9luJqxuD6sMVy)
                  </p>
                </div>

                {testResult && (
                  <Alert className={testResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                      {testResult.message}
                      {testResult.url && (
                        <p className="text-xs mt-1 font-mono">{testResult.url}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-white rounded-lg p-3 text-xs text-gray-700">
                  <p className="font-semibold mb-1">Como obter o ID do arquivo:</p>
                  <p>1. Abra o arquivo no Google Drive</p>
                  <p>2. Copie a URL (ex: https://drive.google.com/file/d/<strong>ID_DO_ARQUIVO</strong>/view)</p>
                  <p>3. Cole apenas o ID_DO_ARQUIVO no campo acima</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Bell className="w-5 h-5 text-blue-700" />
            <div className="flex-1">
              <label className="text-sm font-medium text-blue-900 mb-1 block">
                Email para Notificações de Erro
              </label>
              <Input
                type="email"
                placeholder={user?.email || "Digite seu email"}
                value={notificacaoEmail}
                onChange={(e) => setNotificacaoEmail(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={sincronizar}
              disabled={isSincronizando}
              size="lg"
              className="bg-gradient-to-r from-purple-900 to-purple-800 hover:from-purple-800 hover:to-purple-700 h-14 px-8 text-lg"
            >
              {isSincronizando ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          </div>
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
                  <p className="font-semibold mb-2">✅ Sincronização incremental concluída!</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Total de linhas no arquivo:</strong> {resultado.totalLinhas}</li>
                    <li><strong>Pedidos processados (novos/alterados):</strong> {resultado.processados}</li>
                    <li><strong>Pedidos novos criados:</strong> {resultado.novos}</li>
                    <li><strong>Pedidos atualizados:</strong> {resultado.atualizados}</li>
                    <li><strong>Pedidos ignorados (com solicitação):</strong> {resultado.ignorados}</li>
                    {resultado.erros > 0 && <li className="text-orange-600">{resultado.erros} linhas com erro</li>}
                  </ul>
                  {resultado.detalhes.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-medium">Ver erros ({resultado.detalhes.length})</summary>
                      <ul className="mt-2 text-xs space-y-1 max-h-60 overflow-y-auto">
                        {resultado.detalhes.map((erro, i) => (
                          <li key={i}>{erro}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-semibold mb-2">❌ Erro na sincronização</p>
                  <p>{resultado.message}</p>
                  <p className="mt-2 text-sm">
                    Verifique se o arquivo do Google Drive está com permissão de acesso público (qualquer pessoa com o link).
                  </p>
                  <p className="mt-2 text-xs font-mono bg-red-100 p-2 rounded">
                   Arquivo ID: {driveFileId || 'Não configurado'}
                  </p>
                  <p className="mt-1 text-xs">
                    <strong>Dica:</strong> Abra o Console do navegador (F12) para ver logs detalhados do download e análise do arquivo.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-bold text-orange-900 text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ⚠️ Configure o Google Drive Corretamente
            </h4>
            
            <div className="bg-white rounded-lg p-4 space-y-3">
              <p className="font-semibold text-gray-900">Passo a passo para liberar acesso ao arquivo:</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">1.</span>
                  <div>
                    <p className="font-medium">Abra o arquivo no Google Drive:</p>
                    {driveFileId && (
                      <a 
                        href={getGoogleDriveUrls(driveFileId).viewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {getGoogleDriveUrls(driveFileId).viewLink}
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">2.</span>
                  <p>Clique no botão <strong>"Compartilhar"</strong> (canto superior direito)</p>
                </div>
                
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">3.</span>
                  <p>Em "Acesso geral", selecione <strong>"Qualquer pessoa com o link"</strong></p>
                </div>
                
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">4.</span>
                  <p>Certifique-se de que está como <strong>"Leitor"</strong> (não precisa ser editor)</p>
                </div>
                
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">5.</span>
                  <p>Clique em <strong>"Copiar link"</strong> e depois em <strong>"Concluído"</strong></p>
                </div>
                
                <div className="flex gap-2">
                  <span className="font-bold text-orange-600">6.</span>
                  <p><strong>Teste:</strong> Abra uma aba anônima do navegador (Ctrl+Shift+N) e cole o link - você deve conseguir visualizar o arquivo</p>
                </div>
              </div>
              
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="w-4 h-4 text-yellow-700" />
                <AlertDescription className="text-yellow-800 text-sm">
                  <strong>Importante:</strong> Se o arquivo estiver em uma pasta restrita ou em um Google Drive corporativo, 
                  você precisará mover o arquivo para "Meu Drive" ou garantir que a pasta pai também está compartilhada publicamente.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">📋 Informações do arquivo configurado:</p>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{driveFileId || 'Não configurado'}</code></p>
                <p><strong>Nome esperado:</strong> resultado_consulta.txt</p>
                <p><strong>Formato:</strong> CSV com ponto-e-vírgula (;)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Recursos da Sincronização Automática
          </h4>
          <ul className="text-sm text-purple-800 space-y-2">
            <li>✓ Sincronização automática a cada 4 horas</li>
            <li>✓ <strong>Sincronização Incremental:</strong> Processa apenas pedidos novos ou alterados</li>
            <li>✓ <strong>Ignora pedidos com solicitação pendente</strong></li>
            <li>✓ Download direto do Google Drive (sem LLM)</li>
            <li>✓ Tenta 4 URLs diferentes automaticamente</li>
            <li>✓ Logs detalhados de todas as operações</li>
            <li>✓ Notificações por email em caso de erros</li>
          </ul>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>✅ Sincronização 100% Automática:</strong> O sistema sincroniza automaticamente a cada 4 horas, sem necessidade de intervenção humana. A primeira sincronização inicia automaticamente ao carregar a página. Você também pode forçar uma sincronização manual a qualquer momento.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}