export default function VersionFilter({ team, value, onChange }) {
  if ((team.versions || []).length < 2) return null
  return (
    <label className="version-filter">
      <span>Version</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">All versions</option>
        {[...team.versions].reverse().map(v => (
          <option key={v.id} value={v.id}>
            v{v.number}{v.note ? `: ${v.note.length > 32 ? v.note.slice(0, 32) + '…' : v.note}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
