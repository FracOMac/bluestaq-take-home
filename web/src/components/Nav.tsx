import { NavLink } from 'react-router-dom'

function linkClass(isActive: boolean, extra = '') {
  const state = isActive
    ? 'text-gray-900 font-medium'
    : 'text-gray-600 hover:text-gray-900'
  return `${extra} ${state}`.trim()
}

export function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-4 p-4">
        <NavLink to="/notes" className={({ isActive }) => linkClass(isActive)}>
          Notes
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => linkClass(isActive)}>
          Teams
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => linkClass(isActive, 'ml-auto')}
        >
          Sign in
        </NavLink>
      </div>
    </nav>
  )
}
