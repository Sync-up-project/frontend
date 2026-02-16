import { NavLink } from "react-router-dom";

const navLinkClass =
  "relative px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:text-purple-600";

export function TopNav() {
  return (
    <nav className="flex items-center gap-2">
      <NavLink
        to="/projects"
        className={({ isActive }) => `${navLinkClass} ${isActive ? "text-purple-600" : "text-gray-700"}`}
      >
        프로젝트
      </NavLink>

      <NavLink
        to="/community"
        className={({ isActive }) => `${navLinkClass} ${isActive ? "text-purple-600" : "text-gray-700"}`}
      >
        커뮤니티
      </NavLink>

      <NavLink
        to="/notice"
        className={({ isActive }) => `${navLinkClass} ${isActive ? "text-purple-600" : "text-gray-700"}`}
      >
        공지사항
      </NavLink>

      <NavLink
        to="/mypage"
        className={({ isActive }) => `${navLinkClass} ${isActive ? "text-purple-600" : "text-gray-700"}`}
      >
        마이페이지
      </NavLink>
    </nav>
  );
}
