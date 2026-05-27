import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="w-full p-4 border-t border-gray-200 shadow md:flex md:items-center md:justify-between md:p-6 dark:bg-gray-800 dark:border-gray-600">
      <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
        EQMonitor is developed by{' '}
        <a href="https://github.com/YumNumm" className="btn-link">
          Ryotaro Onoue(aka. もぐもぐ)
        </a>
        .
      </span>
      <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
        <li>
          <Link to="/privacy_policy" className="hover:underline me-4 md:me-6">
            プライバシーポリシー
          </Link>
        </li>
        <li>
          <Link to="/term_of_service" className="hover:underline me-4 md:me-6">
            利用規約
          </Link>
        </li>
        <li>
          <Link to="/contact" className="hover:underline">
            お問い合わせ
          </Link>
        </li>
      </ul>
    </footer>
  )
}
