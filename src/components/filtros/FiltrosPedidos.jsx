import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function FiltrosPedidos({ filtros, onFiltrosChange }) {
  const handleChange = (campo, valor) => {
    onFiltrosChange({ ...filtros, [campo]: valor });
  };

  return (
    <Card className="border-0 shadow-md mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-900" />
            <h3 className="font-semibold text-blue-900">Filtros de Busca</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filtros.ocultarVolume0 || false}
              onChange={(e) => handleChange('ocultarVolume0', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Ocultar volume = 0</span>
          </label>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="🔍 Buscar por número do pedido"
                value={filtros.numero_pedido || ''}
                onChange={(e) => handleChange('numero_pedido', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="🔍 Buscar por nome do cliente"
                value={filtros.nome_cliente || ''}
                onChange={(e) => handleChange('nome_cliente', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="🔍 Código do cliente"
                value={filtros.codigo_cliente || ''}
                onChange={(e) => handleChange('codigo_cliente', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="🔍 Buscar por produto"
                value={filtros.nome_produto || ''}
                onChange={(e) => handleChange('nome_produto', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              value={filtros.status || 'todos'}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="📊 Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="parcialmente_faturado">Parcialmente Faturado</SelectItem>
                <SelectItem value="faturado">Faturado</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="🔍 Buscar por vendedor"
                value={filtros.vendedor || ''}
                onChange={(e) => handleChange('vendedor', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                type="date"
                placeholder="📅 Data inicial"
                value={filtros.data_inicial || ''}
                onChange={(e) => handleChange('data_inicial', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                type="date"
                placeholder="📅 Data final"
                value={filtros.data_final || ''}
                onChange={(e) => handleChange('data_final', e.target.value)}
                className="pl-10 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>

          {(filtros.numero_pedido || filtros.nome_cliente || filtros.codigo_cliente || filtros.nome_produto || 
            filtros.vendedor || filtros.data_inicial || filtros.data_final || (filtros.status && filtros.status !== 'todos')) && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm font-medium text-blue-900">
                ✅ Filtros ativos
              </span>
              <button
                onClick={() => onFiltrosChange({})}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}