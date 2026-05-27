import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="w-full p-4 border-t border-base-300 bg-base-200 shadow md:flex md:items-center md:justify-between md:p-6">
      <span className="text-sm text-base-content/60 sm:text-center">
        EQMonitor is developed by{' '}
        <a href="https://github.com/YumNumm" className="btn-link">
          Ryotaro Onoue(aka. もぐもぐ)
        </a>
        .
      </span>
      <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-base-content/60 sm:mt-0">
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
          <Link to="/guideline" className="hover:underline me-4 md:me-6">
            ガイドライン対応状況
          </Link>
        </li>
        <li>
          <Link to="/asctl" className="hover:underline me-4 md:me-6">
            特定商取引法に基づく表記
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
