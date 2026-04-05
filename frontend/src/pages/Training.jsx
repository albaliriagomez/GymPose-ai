import DashboardLayout from '../components/DashboardLayout'

export default function Training() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="font-display font-bold text-3xl text-white mb-2">Entrenamiento</div>
          <div className="text-gym-muted font-mono text-sm">Próximamente</div>
        </div>
      </div>
    </DashboardLayout>
  )
}