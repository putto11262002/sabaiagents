import React from "react";
import { Link } from "react-router";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold hover:text-blue-200 transition">
              Sabai Agents
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link
              to="/"
              className="hover:text-blue-200 transition font-medium"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="hover:text-blue-200 transition font-medium"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
