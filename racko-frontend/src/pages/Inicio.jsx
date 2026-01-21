import UpcomingDueWidget from "../components/layout/UpcomingDue";
import UltimosPrestamos from "../components/common/UltimosPrestamos";
import PredictivoWidget from "../components/common/PredictivoWidget";

export default function Inicio() {
  console.log("INICIO MONTADO");
  return (
    <div className="dashboard-grid">
      <UpcomingDueWidget />

      <div className="dashboard-row-2">
        <UltimosPrestamos limit={5} />
        <PredictivoWidget />
      </div>
    </div>
  );
}

