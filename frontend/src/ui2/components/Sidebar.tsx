import React from 'react';

export function Sidebar() {
  return (
    <aside className="ng-sidebar">
      <div className="brand">
        <div className="logo">🧪</div>
        <div className="title">Nano Generator</div>
      </div>
      <nav className="nav">
        <a className="nav-item active">Генерация</a>
      </nav>
      <footer className="sidebar-footer">
        <small>Google Gemini 2.5 Flash Image (OpenRouter)</small>
      </footer>
    </aside>
  );
}


