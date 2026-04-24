import Navbar      from './components/Navbar'
import Hero        from './components/Hero'
import TickerBar   from './components/TickerBar'
import StockPredictor from './components/StockPredictor'
import About       from './components/About'
import Models      from './components/Models'
import HowItWorks  from './components/HowItWorks'
import TechStack   from './components/TechStack'
import Footer      from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#f0eed5] overflow-x-hidden">
      <Navbar />
      <div className="pt-16">
        <TickerBar />
        <Hero />
        <StockPredictor />
        <About />
        <Models />
        <HowItWorks />
        <TechStack />
        <Footer />
      </div>
    </div>
  )
}
