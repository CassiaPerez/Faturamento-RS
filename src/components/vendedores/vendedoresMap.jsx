// Mapeamento de conversão de ID_Vendedor para Cod_Vendedor
export const codigoConversaoMap = {
  "85400": "255340",
  "107806": "275706",
  "76147": "247945",
  "108530": "276266",
  "81125": "251932",
  "25821": "745893",
  "18872": "212085",
  "23795": "216023",
  "11577": "101471",
  "21183": "214231",
  "23119": "215538",
  "43269": "230157",
  "87229": "256841",
  "80732": "251623",
  "54318": "238772",
  "77730": "249228",
  "25764": "745842",
  "59984": "242974",
  "89980": "259032",
  "45733": "232007",
  "58785": "242075",
  "54506": "238910",
  "34849": "223797",
  "29994": "220363",
  "91532": "260263"
};

// Função para converter ID_Vendedor para Cod_Vendedor
export const converterCodigoVendedor = (codigoOriginal) => {
  // Se não tiver código ou for undefined/null, retornar Dante Damiani
  if (!codigoOriginal || codigoOriginal === 'undefined') {
    return '745842';
  }
  
  // Redirecionar VENDAS INTERNAS 001 para Dante Luis Damiani
  if (codigoOriginal === '256841' || codigoOriginal === '87229') {
    return '745842';
  }
  
  return codigoConversaoMap[codigoOriginal] || codigoOriginal;
};

// Mapeamento de códigos de vendedores para nomes
export const vendedoresMap = {
  // A. J. DEBONI & CIA LTDA
  "251932": { codigoReal: "251932", empresa: "A. J. DEBONI & CIA LTDA", vendedor: "A. J. DEBONI & CIA LTDA" },
  "224464": { codigoReal: "251932", empresa: "A. J. DEBONI & CIA LTDA", vendedor: "A. J. DEBONI & CIA LTDA" },
  "81125": { codigoReal: "251932", empresa: "A. J. DEBONI & CIA LTDA", vendedor: "A. J. DEBONI & CIA LTDA" },
  
  // AGRO RUPPENTHAL SERVICOS DE INFORMATICA LTDA
  "276266": { codigoReal: "276266", empresa: "AGRO RUPPENTHAL SERVICOS DE INFORMATICA LTDA", vendedor: "AGRO RUPPENTHAL SERVICOS DE INFORMATICA LTDA" },
  "108530": { codigoReal: "276266", empresa: "AGRO RUPPENTHAL SERVICOS DE INFORMATICA LTDA", vendedor: "AGRO RUPPENTHAL SERVICOS DE INFORMATICA LTDA" },
  
  // AGROINOVA REPRES. COM.LTDA - MAURICIO NUNES
  "242786": { codigoReal: "242786", empresa: "AGROINOVA REPRES. COM.LTDA - MAURICIO NUNES", vendedor: "AGROINOVA REPRES. COM.LTDA - MAURICIO NUNES" },
  "59712": { codigoReal: "242786", empresa: "AGROINOVA REPRES. COM.LTDA - MAURICIO NUNES", vendedor: "AGROINOVA REPRES. COM.LTDA - MAURICIO NUNES" },
  
  // BAGUAL AGRO PARTICIPACOES EIRELI
  "223797": { codigoReal: "223797", empresa: "BAGUAL AGRO PARTICIPACOES EIRELI", vendedor: "BAGUAL AGRO PARTICIPACOES EIRELI" },
  "34849": { codigoReal: "223797", empresa: "BAGUAL AGRO PARTICIPACOES EIRELI", vendedor: "BAGUAL AGRO PARTICIPACOES EIRELI" },
  
  // BENTO REPRESENTACAO COMERCIAL LTDA
  "122723": { codigoReal: "122723", empresa: "BENTO REPRESENTACAO COMERCIAL LTDA", vendedor: "BENTO REPRESENTACAO COMERCIAL LTDA" },
  
  // BRUNA SALBEGO BERGUEMAIER-ME
  "232007": { codigoReal: "232007", empresa: "BRUNA SALBEGO BERGUEMAIER-ME", vendedor: "BRUNA SALBEGO BERGUEMAIER-ME" },
  "45733": { codigoReal: "232007", empresa: "BRUNA SALBEGO BERGUEMAIER-ME", vendedor: "BRUNA SALBEGO BERGUEMAIER-ME" },
  
  // DANIEL LORENZONI LTDA
  "247945": { codigoReal: "247945", empresa: "DANIEL LORENZONI LTDA", vendedor: "DANIEL LORENZONI LTDA" },
  "76147": { codigoReal: "247945", empresa: "DANIEL LORENZONI LTDA", vendedor: "DANIEL LORENZONI LTDA" },
  
  // DANTE LUIS DAMIANI
  "745842": { codigoReal: "745842", empresa: "DANTE LUIS DAMIANI", vendedor: "DANTE LUIS DAMIANI" },
  "25764": { codigoReal: "745842", empresa: "DANTE LUIS DAMIANI", vendedor: "DANTE LUIS DAMIANI" },
  
  // DESESSARDS E VIEIRA REPRESENTACOES LTDA
  "255340": { codigoReal: "255340", empresa: "DESESSARDS E VIEIRA REPRESENTACOES LTDA", vendedor: "DESESSARDS E VIEIRA REPRESENTACOES LTDA" },
  "85400": { codigoReal: "255340", empresa: "DESESSARDS E VIEIRA REPRESENTACOES LTDA", vendedor: "DESESSARDS E VIEIRA REPRESENTACOES LTDA" },
  
  // DIRETORIA
  "113514": { codigoReal: "113514", empresa: "DIRETORIA", vendedor: "DIRETORIA" },
  
  // EDUARDO FATTORE & CIA LTDA
  "251623": { codigoReal: "251623", empresa: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)", vendedor: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)" },
  "275706": { codigoReal: "275706", empresa: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)", vendedor: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)" },
  "80732": { codigoReal: "251623", empresa: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)", vendedor: "EDUARDO FATTORE & CIA LTDA( NAO UTILIZAR)" },
  
  // EDUARDO FATTORE E CIA LTDA
  "251623": { codigoReal: "275706", empresa: "EDUARDO FATTORE E CIA LTDA", vendedor: "EDUARDO FATTORE E CIA LTDA" },
  "107806": { codigoReal: "275706", empresa: "EDUARDO FATTORE E CIA LTDA", vendedor: "EDUARDO FATTORE E CIA LTDA" },
  
  // EFETIVO CONSULTORIA EMPRESARIAL LTDA
  "76889": { codigoReal: "76889", empresa: "EFETIVO CONSULTORIA EMPRESARIAL LTDA", vendedor: "EFETIVO CONSULTORIA EMPRESARIAL LTDA" },
  
  // FABIO DA ROCHA CORBELLINI EIRELI
  "238772": { codigoReal: "238772", empresa: "FABIO DA ROCHA CORBELLINI EIRELI", vendedor: "FABIO DA ROCHA CORBELLINI EIRELI" },
  "54318": { codigoReal: "238772", empresa: "FABIO DA ROCHA CORBELLINI EIRELI", vendedor: "FABIO DA ROCHA CORBELLINI EIRELI" },
  
  // GLOWACKI AGENCIAMENTOS DE INSUMOS AGRICOLAS LTDA
  "745893": { codigoReal: "745893", empresa: "GLOWACKI AGENCIAMENTOS DE INSUMOS AGRICOLAS LTDA", vendedor: "GLOWACKI AGENCIAMENTOS DE INSUMOS AGRICOLAS LTDA" },
  "25821": { codigoReal: "745893", empresa: "GLOWACKI AGENCIAMENTOS DE INSUMOS AGRICOLAS LTDA", vendedor: "GLOWACKI AGENCIAMENTOS DE INSUMOS AGRICOLAS LTDA" },
  
  // INTERCOMPANY SOLUS DO BRASIL
  "88543": { codigoReal: "88543", empresa: "INTERCOMPANY SOLUS DO BRASIL", vendedor: "INTERCOMPANY SOLUS DO BRASIL" },
  
  // JOAO FILHO REPRESENTACOES LTDA
  "114815": { codigoReal: "114815", empresa: "JOAO FILHO REPRESENTACOES LTDA", vendedor: "JOAO FILHO REPRESENTACOES LTDA" },
  
  // JOSE ALBERTO SENEDESE
  "112025": { codigoReal: "112025", empresa: "JOSE ALBERTO SENEDESE", vendedor: "JOSE ALBERTO SENEDESE" },
  
  // JULIO CESAR DOS SANTOS
  "35529": { codigoReal: "35529", empresa: "JULIO CESAR DOS SANTOS", vendedor: "JULIO CESAR DOS SANTOS" },
  
  // LARISSA WILKE TEIXEIRA
  "230157": { codigoReal: "230157", empresa: "LARISSA WILKE TEIXEIRA", vendedor: "LARISSA WILKE TEIXEIRA" },
  "43269": { codigoReal: "230157", empresa: "LARISSA WILKE TEIXEIRA", vendedor: "LARISSA WILKE TEIXEIRA" },
  
  // PEDRO HENRIQUE DE BONA
  "11577": { codigoReal: "11577", empresa: "PEDRO HENRIQUE DE BONA", vendedor: "PEDRO HENRIQUE DE BONA" },
  
  // RONALDO ROSSLER RIBAS - ME
  "249228": { codigoReal: "249228", empresa: "RONALDO ROSSLER RIBAS - ME", vendedor: "RONALDO ROSSLER RIBAS - ME" },
  "77730": { codigoReal: "249228", empresa: "RONALDO ROSSLER RIBAS - ME", vendedor: "RONALDO ROSSLER RIBAS - ME" },
  
  // TLM ATIVIDADES AGRICOLAS LTDA - TIAGO LUIZ MALAGI
  "74242": { codigoReal: "74242", empresa: "TLM ATIVIDADES AGRICOLAS LTDA - TIAGO LUIZ MALAGI", vendedor: "TLM ATIVIDADES AGRICOLAS LTDA - TIAGO LUIZ MALAGI" },
  
  // TRANSFERÊNCIAS SOLUS
  "106676": { codigoReal: "106676", empresa: "TRANSFERÊNCIAS SOLUS", vendedor: "TRANSFERÊNCIAS SOLUS" },
  
  // VALDECIR ALVES DE OLIVEIRA-ME
  "242075": { codigoReal: "242075", empresa: "VALDECIR ALVES DE OLIVEIRA-ME", vendedor: "VALDECIR ALVES DE OLIVEIRA-ME" },
  "58785": { codigoReal: "242075", empresa: "VALDECIR ALVES DE OLIVEIRA-ME", vendedor: "VALDECIR ALVES DE OLIVEIRA-ME" },
  
  // VEIT CONSULTORIA AGRICOLA EIRELI
  "238910": { codigoReal: "238910", empresa: "VEIT CONSULTORIA AGRICOLA EIRELI", vendedor: "VEIT CONSULTORIA AGRICOLA EIRELI" },
  "54506": { codigoReal: "238910", empresa: "VEIT CONSULTORIA AGRICOLA EIRELI", vendedor: "VEIT CONSULTORIA AGRICOLA EIRELI" },
  
  // VENDAS INTERNAS 002
  "86772": { codigoReal: "86772", empresa: "VENDAS  INTERNAS 002", vendedor: "VENDAS  INTERNAS 002" },
  
  // VENDAS INTERCOMPANY CROP
  "87235": { codigoReal: "87235", empresa: "VENDAS INTERCOMPANY CROP", vendedor: "VENDAS INTERCOMPANY CROP" },
  
  // VENDAS INTERNAS 001 - Redirecionado para Dante Luis Damiani
  "256841": { codigoReal: "745842", empresa: "DANTE LUIS DAMIANI", vendedor: "DANTE LUIS DAMIANI" },
  "87229": { codigoReal: "745842", empresa: "DANTE LUIS DAMIANI", vendedor: "DANTE LUIS DAMIANI" },
  
  // VENDEDOR INATIVO 001
  "89980": { codigoReal: "259032", empresa: "VENDEDOR INATIVO 001", vendedor: "VENDEDOR INATIVO 001" },
  
  // VENDEDOR TRANSFERENCIAS CROP
  "87236": { codigoReal: "87236", empresa: "VENDEDOR TRANSFERENCIAS CROP", vendedor: "VENDEDOR TRANSFERENCIAS CROP" },
  
  // VILELA INTERMEDIACOES DE NEGOCIOS AGRICOLAS LTDA
  "31236": { codigoReal: "31236", empresa: "VILELA INTERMEDIACOES DE NEGOCIOS AGRICOLAS LTDA", vendedor: "VILELA INTERMEDIACOES DE NEGOCIOS AGRICOLAS LTDA" }
};

export const getNomeVendedor = (codigoVendedor) => {
  const vendedor = vendedoresMap[codigoVendedor];
  return vendedor ? vendedor.vendedor : codigoVendedor;
};

export const getVendedorInfo = (codigoVendedor) => {
  return vendedoresMap[codigoVendedor] || { 
    codigoReal: codigoVendedor, 
    empresa: "Não encontrado", 
    vendedor: codigoVendedor 
  };
};