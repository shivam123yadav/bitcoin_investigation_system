import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import Overview from './pages/Overview';
import Leads from './pages/Leads';
import EntityInvestigation from './pages/Entity';
import GraphInvestigation from './pages/Graph';
import TransactionFlow from './pages/TransactionFlow';
import AnalysisPage from './pages/AnalysisPage';
import Dataset from './pages/Dataset';
import Clusters from './pages/Clusters';
import Patterns from './pages/Patterns';
import Cases from './pages/Cases';
import Settings from './pages/Settings';
import Team from './pages/Team';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<HomePage />} />
        <Route path="/team" element={<Team />} />

        {/* BTC Sentinel Investigation Platform */}
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/overview" element={<Overview />} />
                <Route path="/dataset" element={<Dataset />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/entity/:id" element={<EntityInvestigation />} />
                <Route path="/graph" element={<GraphInvestigation />} />
                <Route path="/flow" element={<TransactionFlow />} />
                <Route path="/clusters" element={<Clusters />} />
                <Route path="/patterns" element={<Patterns />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </HashRouter>
  );
}