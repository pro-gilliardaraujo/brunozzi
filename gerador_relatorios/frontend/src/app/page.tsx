import { getReportStructure } from '@/lib/data-loader';
import { DashboardCard } from '@/components/DashboardCard';
import { Truck, Users, Calendar, BarChart3 } from 'lucide-react';
import path from 'path';

export default async function Home() {
  const structure = await getReportStructure();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-gradient-to-r from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
            Central de Relatórios
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Selecione uma categoria de equipamento para visualizar os indicadores de performance (KPIs) de frotas e operadores.
          </p>
        </header>

        {structure.length === 0 ? (
          <div className="p-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
            Nenhum relatório encontrado na pasta de dados.
            <br />
            <span className="text-xs text-zinc-700 mt-2 block">
              Caminho: {path.join(process.cwd(), '..', '..', 'automacao_etl', 'scripts', 'dados', 'separados', 'json')}
            </span>
          </div>
        ) : (
          <div className="grid gap-12">
            {structure.map((group) => (
              <section key={group.category} className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-900">
                  <h2 className="text-2xl font-bold capitalize text-zinc-200">
                    {group.category.replace(/_/g, ' ')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-xs text-zinc-500 font-mono border border-zinc-800">
                    {group.types.length} TIPOS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Frotas - Diário */}
                  <DashboardCard
                    title="Frotas"
                    subtitle="Relatórios Diários"
                    icon={Truck}
                    href={`/${group.category}/frotas/diario`}
                    variant="primary"
                  />

                  {/* Frotas - Semanal */}
                  <DashboardCard
                    title="Frotas"
                    subtitle="Relatórios Semanais"
                    icon={BarChart3}
                    href={`/${group.category}/frotas/semanal`}
                    variant="secondary"
                  />

                  {/* Operadores - Diário */}
                  <DashboardCard
                    title="Operadores"
                    subtitle="Relatórios Diários"
                    icon={Users}
                    href={`/${group.category}/operadores/diario`}
                    variant="primary"
                  />

                  {/* Operadores - Semanal */}
                  <DashboardCard
                    title="Operadores"
                    subtitle="Relatórios Semanais"
                    icon={Calendar}
                    href={`/${group.category}/operadores/semanal`}
                    variant="secondary"
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
