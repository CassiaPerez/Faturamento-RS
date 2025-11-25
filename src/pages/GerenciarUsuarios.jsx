import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserCog, Search, AlertCircle, CheckCircle2, UserPlus, Trash2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GerenciarUsuarios() {
  const [busca, setBusca] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [novoRole, setNovoRole] = useState('');
  const [codigoVendedor, setCodigoVendedor] = useState('');
  const [mostrarDialogExcluir, setMostrarDialogExcluir] = useState(false);
  const [mostrarDialogConvidar, setMostrarDialogConvidar] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    codigos_vendedor: []
  });
  const [codigosVendedor, setCodigosVendedor] = useState([]);
  const [inputCodigo, setInputCodigo] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list('-created_date', 1000)
  });

  const atualizarUsuarioMutation = useMutation({
    mutationFn: async ({ userId, dados }) => {
      console.log('Atualizando usuário:', userId, dados);
      const result = await base44.entities.User.update(userId, dados);
      console.log('Resultado:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setUsuarioSelecionado(null);
      setNovoRole('');
      setCodigosVendedor([]);
      setInputCodigo('');
      alert('✅ Usuário atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar usuário:', error);
      alert('❌ Erro ao atualizar usuário: ' + error.message);
    }
  });

  const excluirUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setUsuarioSelecionado(null);
    }
  });

  const criarUsuarioMutation = useMutation({
    mutationFn: async (dados) => {
      // Nota: A criação de usuários pode requerer configuração especial no backend
      // Por enquanto, vamos tentar atualizar um usuário existente após convite
      alert('Para criar usuários, convide-os através do Dashboard da Base44. Após o cadastro, você pode editar as permissões e códigos aqui.');
      throw new Error('Use o Dashboard para convidar usuários');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setMostrarDialogConvidar(false);
      setNovoUsuario({
        full_name: '',
        email: '',
        password: '',
        role: 'user',
        codigos_vendedor: []
      });
      setCodigosVendedor([]);
      setInputCodigo('');
    }
  });

  // Verificar se o usuário é admin
  const permissaoAtual = currentUser?.permissao_customizada || currentUser?.role;
  if (currentUser && permissaoAtual !== 'admin') {
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

  const usuariosFiltrados = usuarios.filter(user => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    const permissao = user.permissao_customizada || user.role;
    return (
      user.full_name?.toLowerCase().includes(buscaLower) ||
      user.email?.toLowerCase().includes(buscaLower) ||
      permissao?.toLowerCase().includes(buscaLower) ||
      (user.codigos_vendedor && user.codigos_vendedor.some(c => c.toLowerCase().includes(buscaLower)))
    );
  });

  const handleEditarUsuario = (usuario) => {
    setUsuarioSelecionado(usuario);
    setNovoRole(usuario.permissao_customizada || usuario.role || 'user');
    setCodigosVendedor(usuario.codigos_vendedor || []);
    setInputCodigo('');
  };

  const confirmarAtualizacao = () => {
    // Validar que vendedores precisam ter pelo menos um código
    if (novoRole === 'user' && codigosVendedor.length === 0) {
      alert('⚠️ Vendedores precisam ter pelo menos um código de vendedor');
      return;
    }

    const dados = {
      permissao_customizada: novoRole,
      codigos_vendedor: codigosVendedor
    };

    console.log('Dados a enviar:', dados);
    atualizarUsuarioMutation.mutate({
      userId: usuarioSelecionado.id,
      dados
    });
  };

  const handleExcluirUsuario = (usuario) => {
    setUsuarioSelecionado(usuario);
    setMostrarDialogExcluir(true);
  };

  const confirmarExclusao = () => {
    excluirUsuarioMutation.mutate(usuarioSelecionado.id);
    setMostrarDialogExcluir(false);
  };

  const handleConvidarUsuario = () => {
    setNovoUsuario({
      full_name: '',
      email: '',
      password: '',
      role: 'user',
      codigos_vendedor: []
    });
    setCodigosVendedor([]);
    setInputCodigo('');
    setMostrarDialogConvidar(true);
  };

  const confirmarCriacaoUsuario = () => {
    if (!novoUsuario.full_name || !novoUsuario.email || !novoUsuario.password) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validar que vendedores precisam ter pelo menos um código
    if (novoUsuario.role === 'user' && codigosVendedor.length === 0) {
      alert('Vendedores precisam ter pelo menos um código de vendedor');
      return;
    }

    const dados = {
      full_name: novoUsuario.full_name,
      email: novoUsuario.email,
      role: novoUsuario.role,
      codigos_vendedor: codigosVendedor
    };

    criarUsuarioMutation.mutate(dados);
  };

  const adicionarCodigo = () => {
    if (inputCodigo.trim() && !codigosVendedor.includes(inputCodigo.trim())) {
      setCodigosVendedor([...codigosVendedor, inputCodigo.trim()]);
      setInputCodigo('');
    }
  };

  const removerCodigo = (codigo) => {
    setCodigosVendedor(codigosVendedor.filter(c => c !== codigo));
  };

  const getRoleBadge = (role) => {
    const configs = {
      admin: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Admin' },
      gerente: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Gerente' },
      faturamento: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Faturamento' },
      user: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Vendedor' }
    };
    const config = configs[role] || configs.user;
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-purple-900 mb-2">Gerenciar Usuários</h1>
            <p className="text-gray-600">Gerencie permissões e atribua vendedores aos usuários</p>
          </div>
          <Button
            onClick={() => window.open('https://app.base44.com/dashboard', '_blank')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, role ou código de vendedor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-900 to-purple-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <UserCog className="w-6 h-6" />
              Usuários do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Código Vendedor</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        Carregando usuários...
                      </TableCell>
                    </TableRow>
                  ) : usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((user) => (
                      <TableRow key={user.id} className="hover:bg-purple-50 transition-colors">
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.permissao_customizada || user.role)}</TableCell>
                        <TableCell>
                          {user.codigos_vendedor && user.codigos_vendedor.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.codigos_vendedor.map((codigo, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {codigo}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(user.created_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => handleEditarUsuario(user)}
                              size="sm"
                              variant="outline"
                              className="hover:bg-purple-100"
                            >
                              <UserCog className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            {user.id !== currentUser?.id && (
                              <Button
                                onClick={() => handleExcluirUsuario(user)}
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="w-4 h-4" />
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

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <strong>💡 Dica:</strong> Atribua um <strong>código de vendedor</strong> aos usuários com role "Vendedor" (user) 
            para limitar a visualização apenas aos pedidos deles no Painel do Vendedor.
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={!!usuarioSelecionado} onOpenChange={() => setUsuarioSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-purple-900">Editar Usuário</DialogTitle>
          </DialogHeader>
          
          {usuarioSelecionado && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 rounded-lg space-y-2">
                <p><strong>Nome:</strong> {usuarioSelecionado.full_name}</p>
                <p><strong>Email:</strong> {usuarioSelecionado.email}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permissão (Role) <span className="text-red-500">*</span>
                  </label>
                  <Select value={novoRole} onValueChange={setNovoRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a permissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin (Acesso Total)</SelectItem>
                      <SelectItem value="gerente">Gerente (Visualização)</SelectItem>
                      <SelectItem value="faturamento">Faturamento (Aprovação)</SelectItem>
                      <SelectItem value="user">Vendedor (Solicitações)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {novoRole === 'user' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Códigos do Vendedor <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={inputCodigo}
                        onChange={(e) => setInputCodigo(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && adicionarCodigo()}
                        placeholder="Ex: 745842"
                      />
                      <Button type="button" onClick={adicionarCodigo} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {codigosVendedor.map((codigo, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono flex items-center gap-1">
                          {codigo}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                            onClick={() => removerCodigo(codigo)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Adicione os códigos de vendedor para este usuário
                    </p>
                  </div>
                )}
              </div>

              {novoRole === 'user' && (
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertCircle className="w-4 h-4 text-yellow-700" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Importante:</strong> Vendedores com código atribuído só verão pedidos 
                    vinculados ao seu código no Painel do Vendedor.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioSelecionado(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAtualizacao}
              disabled={atualizarUsuarioMutation.isPending}
              className="bg-purple-900 hover:bg-purple-800"
            >
              {atualizarUsuarioMutation.isPending ? (
                'Salvando...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={mostrarDialogExcluir} onOpenChange={setMostrarDialogExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-red-900">Excluir Usuário</DialogTitle>
          </DialogHeader>
          
          {usuarioSelecionado && (
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Nome:</strong> {usuarioSelecionado.full_name}</p>
                <p><strong>Email:</strong> {usuarioSelecionado.email}</p>
                <p><strong>Role:</strong> {usuarioSelecionado.role}</p>
              </div>

              <p className="text-sm text-gray-600">
                Tem certeza que deseja excluir este usuário?
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMostrarDialogExcluir(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarExclusao}
              disabled={excluirUsuarioMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluirUsuarioMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar Usuário */}
      <Dialog open={mostrarDialogConvidar} onOpenChange={setMostrarDialogConvidar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-purple-900">Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={novoUsuario.full_name}
                onChange={(e) => setNovoUsuario({...novoUsuario, full_name: e.target.value})}
                placeholder="Ex: João da Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})}
                placeholder="Ex: joao@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={novoUsuario.password}
                onChange={(e) => setNovoUsuario({...novoUsuario, password: e.target.value})}
                placeholder="Senha de acesso"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Permissão (Role) <span className="text-red-500">*</span>
              </label>
              <Select 
                value={novoUsuario.role} 
                onValueChange={(value) => setNovoUsuario({...novoUsuario, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a permissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Acesso Total)</SelectItem>
                  <SelectItem value="gerente">Gerente (Visualização)</SelectItem>
                  <SelectItem value="faturamento">Faturamento (Aprovação)</SelectItem>
                  <SelectItem value="user">Vendedor (Solicitações)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {novoUsuario.role === 'user' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Códigos do Vendedor <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={inputCodigo}
                      onChange={(e) => setInputCodigo(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && adicionarCodigo()}
                      placeholder="Ex: 745842"
                    />
                    <Button type="button" onClick={adicionarCodigo} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {codigosVendedor.map((codigo, idx) => (
                      <Badge key={idx} variant="outline" className="font-mono flex items-center gap-1">
                        {codigo}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-red-600" 
                          onClick={() => removerCodigo(codigo)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Adicione os códigos de vendedor para este usuário
                  </p>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    <strong>Dica:</strong> Vendedores com código atribuído só verão seus próprios pedidos no sistema.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMostrarDialogConvidar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarCriacaoUsuario}
              disabled={criarUsuarioMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {criarUsuarioMutation.isPending ? (
                'Criando...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}