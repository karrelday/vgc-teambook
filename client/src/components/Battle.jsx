import { usePersistentState } from '../lib/persist'
import { emptySide } from '../lib/calc'
import Speed from './Speed'
import Calcs, { newCalc } from './Calcs'

/** Speed tiers and the damage calc side by side, sharing one calculator. */
export default function Battle(props) {
  const { team } = props
  const [calc, setCalc] = usePersistentState(`teambook:calc:${team._id}`, () => newCalc(team))

  // "Calc" on a Speed row: put that Pokémon on the opponent's side of the calculator
  const pick = species => {
    setCalc(c => {
      const side = { ...emptySide('theirs'), species }
      return c.attacker.source === 'mine'
        ? { ...c, defender: side }
        : { ...c, attacker: side, move: '' }
    })
    document.querySelector('.calc-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="battle">
      <Speed {...props} onPick={pick} />
      <Calcs {...props} calc={calc} setCalc={setCalc} />
    </div>
  )
}
