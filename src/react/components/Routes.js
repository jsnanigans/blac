import { Route, Routes } from "react-router-dom";
import Sandbox from "./Sandbox";
import React from "react";
export default function AppRoutes() {
    return (React.createElement(Routes, null,
        React.createElement(Route, { path: "/", element: React.createElement(Sandbox, null) }),
        React.createElement(Route, { path: "/sandbox", element: React.createElement(Sandbox, null) })));
}
