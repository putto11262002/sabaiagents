import React from "react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        About This Project
      </h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Backend</h3>
            <ul className="text-gray-700 space-y-1">
              <li>Bun runtime</li>
              <li>TypeScript</li>
              <li>HTML imports</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
            <ul className="text-gray-700 space-y-1">
              <li>React 19</li>
              <li>React Router (declarative)</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-600 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Developer Experience</h3>
        <p className="text-blue-800">
          This setup provides hot module reload, fast builds, and a clean separation
          between server and frontend code following established conventions.
        </p>
      </div>
    </div>
  );
}
