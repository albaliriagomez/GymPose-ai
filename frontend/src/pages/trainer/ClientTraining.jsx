import { useNavigate, useParams } from "react-router-dom";

export default function ClientTraining() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gym-bg p-5 text-gym-text md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-gym-muted">Panel entrenador</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white">Plan de entrenamiento</h1>
          </div>
          <button
            onClick={() => navigate("/trainer/dashboard")}
            className="rounded-xl border border-gym-border bg-gym-accent px-4 py-2.5 text-sm font-mono text-gym-muted hover:text-white"
          >
            ← Volver
          </button>
        </header>

        <section className="rounded-2xl border border-gym-border bg-gym-sidebar p-8 text-center">
          <p className="font-display text-xl font-bold text-white">Placeholder de entrenamiento</p>
          <p className="mt-2 text-sm text-gym-muted">
            Cliente: {id}. Esta vista queda lista para conectar el plan real en el siguiente sprint.
          </p>
        </section>
      </div>
    </div>
  );
}
