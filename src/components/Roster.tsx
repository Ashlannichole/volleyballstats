import { useState } from 'react'
import type { Player, Position } from '../types'
import { POSITION_LABELS, POSITION_COLORS } from '../types'

const POSITIONS: Position[] = ['setter', 'outside', 'middle', 'opposite', 'libero', 'ds']
const POSITION_NAMES: Record<Position, string> = {
  setter: 'Setter', outside: 'Outside Hitter', middle: 'Middle Blocker',
  opposite: 'Opposite', libero: 'Libero', ds: 'DS',
}

interface Props {
  players: Player[]
  onChange: (players: Player[]) => void
}

const blank = (): Omit<Player, 'id'> => ({ name: '', number: 1, position: 'outside' })

export default function Roster({ players, onChange }: Props) {
  const [editing, setEditing] = useState<Player | null>(null)
  const [form, setForm] = useState(blank())
  const [showForm, setShowForm] = useState(false)

  function openAdd() {
    setEditing(null)
    setForm(blank())
    setShowForm(true)
  }

  function openEdit(p: Player) {
    setEditing(p)
    setForm({ name: p.name, number: p.number, position: p.position })
    setShowForm(true)
  }

  function save() {
    if (!form.name.trim()) return
    if (editing) {
      onChange(players.map(p => p.id === editing.id ? { ...editing, ...form } : p))
    } else {
      onChange([...players, { id: crypto.randomUUID(), ...form }])
    }
    setShowForm(false)
  }

  function remove(id: string) {
    onChange(players.filter(p => p.id !== id))
  }

  const sorted = [...players].sort((a, b) => a.number - b.number)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Roster</h2>
        <button
          onClick={openAdd}
          className="tap-btn bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl text-lg"
        >
          + Add Player
        </button>
      </div>

      {players.length === 0 && (
        <p className="text-gray-400 text-center mt-12 text-lg">No players yet. Add your roster above.</p>
      )}

      <div className="space-y-3">
        {sorted.map(p => (
          <div key={p.id} className="bg-navy-700 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-navy-600 border-2 border-white/20 flex items-center justify-center text-xl font-bold text-white shrink-0">
              #{p.number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg truncate">{p.name}</p>
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white mt-1 ${POSITION_COLORS[p.position]}`}>
                {POSITION_LABELS[p.position]} · {POSITION_NAMES[p.position]}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(p)} className="tap-btn text-blue-400 hover:text-blue-300 px-3 py-2 text-sm font-medium">
                Edit
              </button>
              <button onClick={() => remove(p.id)} className="tap-btn text-red-400 hover:text-red-300 px-3 py-2 text-sm font-medium">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-5">{editing ? 'Edit Player' : 'Add Player'}</h3>

            <label className="block text-gray-300 text-sm mb-1">Name</label>
            <input
              className="w-full bg-navy-600 border border-white/20 rounded-xl px-4 py-3 text-white text-lg mb-4 outline-none focus:border-blue-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Player name"
            />

            <label className="block text-gray-300 text-sm mb-1">Jersey #</label>
            <input
              type="number"
              min={0}
              max={99}
              className="w-full bg-navy-600 border border-white/20 rounded-xl px-4 py-3 text-white text-lg mb-4 outline-none focus:border-blue-500"
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: parseInt(e.target.value) || 0 }))}
            />

            <label className="block text-gray-300 text-sm mb-1">Position</label>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  onClick={() => setForm(f => ({ ...f, position: pos }))}
                  className={`tap-btn py-3 rounded-xl font-bold text-sm border-2 transition-colors ${
                    form.position === pos
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-white/10 bg-navy-600 text-gray-300'
                  }`}
                >
                  {POSITION_LABELS[pos]}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="tap-btn flex-1 py-3 rounded-xl border border-white/20 text-gray-300 font-semibold text-lg">
                Cancel
              </button>
              <button onClick={save} className="tap-btn flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
