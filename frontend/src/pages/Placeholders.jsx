import DashboardLayout from '../components/DashboardLayout'
import NutritionModule from './Nutrition'

const Page = ({ title }) => (
  <DashboardLayout>
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="font-display font-bold text-3xl text-white mb-2">{title}</div>
        <div className="text-gym-muted font-mono text-sm">Próximamente</div>
      </div>
    </div>
  </DashboardLayout>
)

export const Posture   = () => <Page title="Analizador Postural" />
export const Nutrition = () => (
  <DashboardLayout>
    <NutritionModule />
  </DashboardLayout>
)
export const Settings  = () => <Page title="Ajustes" />