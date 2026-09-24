// src/app/(padres)/padre/pagos/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { getPagos } from '@/services/padres/padreService';
import { CuotaPension } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { PagoModal } from '@/components/padres/PagoModal';
import {
  CreditCardIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Download01Icon,
} from 'hugeicons-react';

export default function PagosPage() {
  const { selectedHijo, selectedHijoId } = usePadre();
  const [pagos, setPagos] = useState<CuotaPension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuota, setSelectedCuota] = useState<CuotaPension | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPagos(selectedHijoId || undefined);
      setPagos(data);
    } catch (err) {
      console.error('Error cargando pagos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  }, [selectedHijoId]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const totalPagado = pagos
    .filter((p) => p.estado === 'Pagado')
    .reduce((acc, p) => acc + p.total, 0);

  const totalPendiente = pagos
    .filter((p) => p.estado !== 'Pagado')
    .reduce((acc, p) => acc + p.total, 0);

  const cuotasPendientesCount = pagos.filter((p) => p.estado !== 'Pagado').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar el estado de cuenta"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
          FINANZAS Y TESORERÍA ESCOLAR
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
          Estado de Cuenta y Pensiones
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Cronograma oficial de pagos escolares y reporte de transferencias bancarias para el año 2026.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Total Pagado 2026
              </span>
              <p className="text-2xl font-black text-[#15803D]">
                S/ {totalPagado.toFixed(2)}
              </p>
              <p className="text-[11px] text-[#6B7280]">Comprobantes validados</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <CheckmarkCircle02Icon size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Cuotas Pendientes
              </span>
              <p className="text-2xl font-black text-[#BE123C]">
                S/ {totalPendiente.toFixed(2)}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                {cuotasPendientesCount} cuota(s) pendiente(s)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
              <CreditCardIcon size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Estado General
              </span>
              <p className="text-lg font-black text-[#111827]">
                {cuotasPendientesCount === 0 ? 'Sin Deudas' : 'Por Regularizar'}
              </p>
              <p className="text-[11px] text-[#6B7280]">Periodo ordinario vigente</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <AlertCircleIcon size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Bank Account Information Banner */}
      <Card className="bg-gradient-to-r from-slate-50 to-rose-50/40 border border-[#E5E7EB]">
        <CardContent className="p-6">
          <h4 className="text-sm font-bold text-[#111827] mb-3 flex items-center gap-2">
            <span>🏦</span> Cuentas Corrientes y Canales de Recaudación Institucional
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <strong className="text-[#111827] block font-bold">Banco BCP</strong>
              <p className="text-[#6B7280] mt-0.5">Cta Cte: 191-2849102-0-45</p>
              <p className="text-[11px] font-mono text-slate-500">CCI: 00219100284910204550</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <strong className="text-[#111827] block font-bold">Banco BBVA</strong>
              <p className="text-[#6B7280] mt-0.5">Cta Cte: 0011-0492-0100492819</p>
              <p className="text-[11px] font-mono text-slate-500">CCI: 01104920010049281938</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <strong className="text-[#111827] block font-bold">Yape / Plin Empresas</strong>
              <p className="text-[#6B7280] mt-0.5">Número: 984 512 039</p>
              <p className="text-[11px] text-rose-700 font-semibold">Titular: COLEGIO CORAULA SAC</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Cronograma de Pagos del Año Lectivo</CardTitle>
          <CardDescription>
            Detalle de matrícula, pensiones mensuales, recargos y estado de abono
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {pagos.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No hay cuotas registradas"
                description="No se registran obligaciones pendientes para este estudiante."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#6B7280] font-bold border-y border-[#E5E7EB]">
                <tr>
                  <th className="py-3.5 px-5">Concepto</th>
                  <th className="py-3.5 px-5">Vencimiento</th>
                  <th className="py-3.5 px-5">Importe</th>
                  <th className="py-3.5 px-5">Mora</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {pagos.map((cuota) => (
                  <tr key={cuota.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <strong className="font-bold text-[#111827] block">{cuota.concepto}</strong>
                      {cuota.numeroOperacion && (
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          Op: {cuota.numeroOperacion}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-[#6B7280]">
                      {cuota.fechaVencimiento}
                    </td>
                    <td className="py-4 px-5 font-bold text-[#111827]">
                      S/ {cuota.monto.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-500">
                      S/ {cuota.mora.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-black text-sm text-[#BE123C]">
                      S/ {cuota.total.toFixed(2)}
                    </td>
                    <td className="py-4 px-5">
                      <Badge
                        variant={
                          cuota.estado === 'Pagado'
                            ? 'success'
                            : cuota.estado === 'Pendiente'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {cuota.estado}
                      </Badge>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {cuota.estado === 'Pagado' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => alert(`Constancia de pago generada para ${cuota.concepto}`)}
                          leftIcon={<Download01Icon size={14} />}
                        >
                          Recibo
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedCuota(cuota)}
                        >
                          Pagar / Reportar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Pago */}
      <PagoModal
        isOpen={Boolean(selectedCuota)}
        onClose={() => setSelectedCuota(null)}
        cuota={selectedCuota}
        onSuccess={fetchData}
      />
    </div>
  );
}
