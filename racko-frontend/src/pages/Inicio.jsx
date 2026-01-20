import UpcomingDueWidget from "../components/layout/UpcomingDue";

export default function Inicio() {
  const tomorrowDueItems = [
    {
      fecha_vencimiento: "2026-01-11",
      recurso_nombre: "recurso_00",
      usuario_externo_nombre: "Juan Pérez",
    },
    {
      fecha_vencimiento: "2026-01-11",
      recurso_nombre: "recurso_01",
      usuario_externo_nombre: "María López",
    },
  ];

  return (
    <div className="dashboard-grid">
      <UpcomingDueWidget items={tomorrowDueItems} />
    </div>
  );
}

